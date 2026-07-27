/**
 * Seção "Meus Agendamentos" reutilizada em todos os painéis (Lojista,
 * Prestador, Cliente, Parceiro). Mostra compromissos do dia, da semana, do
 * mês e futuros — com filtros, Realtime, notificações em tela (toast) e
 * som de lembrete quando o compromisso está a ≤15min de começar.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Calendar, Clock, MapPin, ChevronRight, Bell, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabaseExternal } from "@/lib/supabaseExternal";
import {
  fetchMyAppointments,
  APPOINTMENT_STATUS,
  APPOINTMENT_TYPES,
  type Appointment,
} from "@/lib/appointments";
import { isChannelEnabled } from "@/lib/notification-prefs";
import { playIncomingMessageSound } from "@/lib/chat-sound";

type Range = "today" | "week" | "month" | "future";

const RANGE_LABELS: Record<Range, string> = {
  today: "Hoje",
  week: "Semana",
  month: "Mês",
  future: "Futuros",
};

const ACTIVE_STATUSES: Appointment["status"][] = [
  "pending",
  "confirmed",
  "rescheduled",
  "checked_in",
];

function startOfDay(d = new Date()) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}
function endOfDay(d = new Date()) {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}
function endOfWeek(d = new Date()) {
  const x = startOfDay(d);
  const dow = x.getDay(); // 0=Dom
  const diff = 6 - dow;
  x.setDate(x.getDate() + diff);
  x.setHours(23, 59, 59, 999);
  return x;
}
function endOfMonth(d = new Date()) {
  const x = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999);
  return x;
}

function withinRange(a: Appointment, range: Range): boolean {
  const t = new Date(a.scheduled_at).getTime();
  const now = new Date();
  switch (range) {
    case "today":
      return t >= startOfDay(now).getTime() && t <= endOfDay(now).getTime();
    case "week":
      return t >= startOfDay(now).getTime() && t <= endOfWeek(now).getTime();
    case "month":
      return t >= startOfDay(now).getTime() && t <= endOfMonth(now).getTime();
    case "future":
      return t >= now.getTime();
  }
}

function fmtWhen(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  const time = d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  if (sameDay) return `Hoje ${time}`;
  const tomorrow = new Date(now); tomorrow.setDate(tomorrow.getDate() + 1);
  if (d.toDateString() === tomorrow.toDateString()) return `Amanhã ${time}`;
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }) + " " + time;
}

function notifyDesktop(title: string, body: string, url = "/agenda") {
  try {
    if (typeof window === "undefined" || !("Notification" in window)) return;
    if (Notification.permission !== "granted") return;
    const n = new Notification(title, { body, tag: `fixxer-appt-${url}` });
    n.onclick = () => { window.focus(); window.location.href = url; };
  } catch { /* ignore */ }
}

export function MyAppointmentsSection({ className = "" }: { className?: string }) {
  const [range, setRange] = useState<Range>("today");
  const [items, setItems] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [uid, setUid] = useState<string | null>(null);
  const knownIds = useRef<Set<string>>(new Set());

  const load = async () => {
    try {
      const list = await fetchMyAppointments();
      const active = list.filter((a) => ACTIVE_STATUSES.includes(a.status));
      // Detecta novos agendamentos (aparece após a carga inicial)
      if (knownIds.current.size > 0) {
        for (const a of active) {
          if (!knownIds.current.has(a.id)) {
            if (isChannelEnabled("appointment_new", "inapp")) {
              toast(`📅 Novo agendamento — ${fmtWhen(a.scheduled_at)}`, {
                description: APPOINTMENT_TYPES[a.type]?.label ?? "Compromisso",
              });
            }
            try { playIncomingMessageSound(); } catch { /* ignore */ }
            notifyDesktop("Novo agendamento", APPOINTMENT_TYPES[a.type]?.label ?? "Compromisso", `/agenda/${a.id}`);
          }
        }
      }
      knownIds.current = new Set(active.map((a) => a.id));
      setItems(active);
    } catch (err) {
      console.warn("[MyAppointments] falha ao carregar:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabaseExternal.auth.getUser();
      if (cancelled) return;
      setUid(data.user?.id ?? null);
      if (!data.user) { setLoading(false); return; }
      await load();
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Realtime: escuta inserts/updates na tabela appointments do usuário
  useEffect(() => {
    if (!uid) return;
    const channel = supabaseExternal
      .channel(`appointments:user:${uid}`)
      .on(
        "postgres_changes" as any,
        { event: "*", schema: "public", table: "appointments" },
        (payload: any) => {
          const row = payload.new ?? payload.old;
          if (!row) return;
          if (row.proposer_id !== uid && row.invitee_id !== uid) return;
          void load();
        },
      )
      .subscribe();
    return () => {
      try { supabaseExternal.removeChannel(channel); } catch { /* ignore */ }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uid]);

  // Lembrete: verifica a cada 60s se algum compromisso começa nos próximos 15min
  useEffect(() => {
    const key = (id: string) => `fixxer:appt-reminder:${id}`;
    const tick = () => {
      const now = Date.now();
      for (const a of items) {
        const t = new Date(a.scheduled_at).getTime();
        const diff = t - now;
        if (diff > 0 && diff <= 15 * 60 * 1000) {
          try {
            if (sessionStorage.getItem(key(a.id))) continue;
            sessionStorage.setItem(key(a.id), "1");
          } catch { /* ignore */ }
          const label = APPOINTMENT_TYPES[a.type]?.label ?? "Compromisso";
          toast(`⏰ Em ${Math.max(1, Math.round(diff / 60000))}min: ${label}`, {
            description: fmtWhen(a.scheduled_at),
          });
          try { playIncomingMessageSound(); } catch { /* ignore */ }
          notifyDesktop("Compromisso próximo", `${label} — ${fmtWhen(a.scheduled_at)}`, `/agenda/${a.id}`);
        }
      }
    };
    tick();
    const int = setInterval(tick, 60 * 1000);
    return () => clearInterval(int);
  }, [items]);

  // Pede permissão de notificação uma vez
  useEffect(() => {
    try {
      if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "default") {
        Notification.requestPermission().catch(() => undefined);
      }
    } catch { /* ignore */ }
  }, []);

  const filtered = useMemo(() => {
    return [...items]
      .filter((a) => withinRange(a, range))
      .sort((a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime());
  }, [items, range]);

  const counts = useMemo(() => ({
    today: items.filter((a) => withinRange(a, "today")).length,
    week: items.filter((a) => withinRange(a, "week")).length,
    month: items.filter((a) => withinRange(a, "month")).length,
    future: items.filter((a) => withinRange(a, "future")).length,
  }), [items]);

  return (
    <section
      className={`bg-[#1A1A1B] border border-white/10 rounded-3xl p-5 md:p-6 space-y-4 ${className}`}
      aria-label="Meus agendamentos"
    >
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-xl bg-[#00FF87]/10 border border-[#00FF87]/30 flex items-center justify-center text-[#00FF87]">
            <Calendar className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-black text-white uppercase italic tracking-tight">
              Meus Agendamentos
            </h3>
            <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">
              Compromissos e lembretes em tempo real
            </p>
          </div>
        </div>
        <Link
          to="/agenda"
          className="text-[10px] font-black uppercase tracking-widest text-[#00FF87] hover:text-white flex items-center gap-1"
        >
          Ver agenda <ChevronRight className="w-3 h-3" />
        </Link>
      </header>

      {/* Tabs de período */}
      <div role="tablist" className="flex flex-wrap gap-2">
        {(Object.keys(RANGE_LABELS) as Range[]).map((r) => {
          const active = r === range;
          return (
            <button
              key={r}
              role="tab"
              aria-selected={active}
              onClick={() => setRange(r)}
              className={`px-3 py-1.5 rounded-xl border text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5 transition-all ${
                active
                  ? "bg-[#00FF87]/15 border-[#00FF87] text-[#00FF87]"
                  : "bg-white/5 border-white/10 text-white hover:border-white/20"
              }`}
            >
              {RANGE_LABELS[r]}
              <span className={`px-1.5 py-0.5 rounded-md text-[9px] ${
                active ? "bg-[#00FF87] text-black" : "bg-white/10 text-white/70"
              }`}>{counts[r]}</span>
            </button>
          );
        })}
      </div>

      {/* Lista */}
      {loading ? (
        <div className="flex items-center gap-2 text-muted-foreground text-xs py-6 justify-center">
          <Loader2 className="w-4 h-4 animate-spin" /> Carregando compromissos...
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-6 space-y-2">
          <div className="text-3xl">🗓️</div>
          <p className="text-xs text-muted-foreground font-medium">
            Nenhum compromisso {RANGE_LABELS[range].toLowerCase()}.
          </p>
          <Link
            to="/agenda"
            className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-[#00FF87] hover:text-white"
          >
            <Bell className="w-3 h-3" /> Configurar agenda
          </Link>
        </div>
      ) : (
        <ul className="space-y-2">
          {filtered.slice(0, 8).map((a) => {
            const s = APPOINTMENT_STATUS[a.status];
            const t = APPOINTMENT_TYPES[a.type];
            return (
              <li key={a.id}>
                <Link
                  to="/agenda/$id"
                  params={{ id: a.id }}
                  className="flex items-center gap-3 p-3 rounded-xl border border-white/10 bg-white/5 hover:border-[#00FF87]/40 hover:bg-white/10 transition-all group"
                >
                  <div className="w-10 h-10 rounded-lg bg-black/40 border border-white/10 flex items-center justify-center text-lg shrink-0">
                    {t?.icon ?? "📅"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-black text-white uppercase tracking-tight truncate">
                        {t?.label ?? "Compromisso"}
                      </span>
                      <span
                        className="px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-widest border"
                        style={{ color: s?.color, borderColor: `${s?.color}55`, background: `${s?.color}18` }}
                      >
                        {s?.icon} {s?.label}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-[10px] text-muted-foreground mt-0.5">
                      <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{fmtWhen(a.scheduled_at)}</span>
                      {a.location_address && (
                        <span className="flex items-center gap-1 truncate">
                          <MapPin className="w-3 h-3" />{a.location_address}
                        </span>
                      )}
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-[#00FF87]" />
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

export default MyAppointmentsSection;
