/**
 * Seção "Meus Agendamentos" reutilizada em todos os painéis (Lojista,
 * Prestador, Cliente, Parceiro).
 *
 * Recursos:
 *  - Filtros por período (hoje/semana/mês/futuros)
 *  - Busca por palavra-chave (nome do contato / serviço / local / notas)
 *  - Paginação (5 por página)
 *  - Modal de detalhes ao clicar no item (com reagendar/cancelar)
 *  - Realtime + notificações em tela e som
 *  - Painel de configurações: antecedência do lembrete (5/10/15/30 min),
 *    som/toast liga-desliga, respeitar preferência do sistema,
 *    "pausar todos os sons" (acessibilidade) e teste de autoplay.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  Calendar, Clock, MapPin, ChevronRight, Bell, Loader2,
  Search, Settings, VolumeX, Volume2, ChevronLeft, PlayCircle,
} from "lucide-react";
import { toast } from "sonner";
import { supabaseExternal } from "@/lib/supabaseExternal";
import {
  fetchMyAppointments,
  APPOINTMENT_STATUS,
  APPOINTMENT_TYPES,
  type Appointment,
} from "@/lib/appointments";
import { isChannelEnabled } from "@/lib/notification-prefs";
import { playIncomingMessageSound, playChatSound } from "@/lib/chat-sound";
import {
  loadAppointmentPrefs,
  saveAppointmentPrefs,
  canPlaySoundNow,
  probeAutoplay,
  showDesktopNotification,
  desktopSupported,
  desktopPermission,
  requestDesktopPermission,
  type AppointmentPrefs,
  type ReminderMinutes,
  type DesktopPermission,
} from "@/lib/appointment-prefs";

import { AppointmentDetailsModal } from "@/components/AppointmentDetailsModal";

type Range = "today" | "week" | "month" | "future";

const RANGE_LABELS: Record<Range, string> = {
  today: "Hoje",
  week: "Semana",
  month: "Mês",
  future: "Futuros",
};

const ACTIVE_STATUSES: Appointment["status"][] = [
  "pending", "confirmed", "rescheduled", "checked_in",
];

const PAGE_SIZE = 5;
const REMINDER_OPTIONS: ReminderMinutes[] = [5, 10, 15, 30];

function startOfDay(d = new Date()) { const x = new Date(d); x.setHours(0,0,0,0); return x; }
function endOfDay(d = new Date())   { const x = new Date(d); x.setHours(23,59,59,999); return x; }
function endOfWeek(d = new Date())  { const x = startOfDay(d); x.setDate(x.getDate() + (6 - x.getDay())); x.setHours(23,59,59,999); return x; }
function endOfMonth(d = new Date()) { return new Date(d.getFullYear(), d.getMonth()+1, 0, 23,59,59,999); }

function withinRange(a: Appointment, range: Range): boolean {
  const t = new Date(a.scheduled_at).getTime();
  const now = new Date();
  switch (range) {
    case "today":  return t >= startOfDay(now).getTime() && t <= endOfDay(now).getTime();
    case "week":   return t >= startOfDay(now).getTime() && t <= endOfWeek(now).getTime();
    case "month":  return t >= startOfDay(now).getTime() && t <= endOfMonth(now).getTime();
    case "future": return t >= now.getTime();
  }
}

function fmtWhen(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const time = d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  if (d.toDateString() === now.toDateString()) return `Hoje ${time}`;
  const tomorrow = new Date(now); tomorrow.setDate(tomorrow.getDate() + 1);
  if (d.toDateString() === tomorrow.toDateString()) return `Amanhã ${time}`;
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }) + " " + time;
}

function normalize(s: string): string {
  return s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}


export function MyAppointmentsSection({ className = "" }: { className?: string }) {
  const [range, setRange] = useState<Range>("today");
  const [items, setItems] = useState<Appointment[]>([]);
  const [contactsById, setContactsById] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [uid, setUid] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [detailsOf, setDetailsOf] = useState<Appointment | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [prefs, setPrefs] = useState<AppointmentPrefs>(() => loadAppointmentPrefs());
  const [autoplay, setAutoplay] = useState<"granted" | "gesture-required" | "unavailable" | "unknown">("unknown");
  const [desktopPerm, setDesktopPerm] = useState<DesktopPermission>(() => desktopPermission());
  const knownIds = useRef<Set<string>>(new Set());


  // Reage a mudanças de preferências vindas de outras abas/componentes
  useEffect(() => {
    const onChange = () => setPrefs(loadAppointmentPrefs());
    window.addEventListener("fixxer:appt-prefs-changed", onChange);
    return () => window.removeEventListener("fixxer:appt-prefs-changed", onChange);
  }, []);

  function updatePrefs(patch: Partial<AppointmentPrefs>) {
    const next = { ...prefs, ...patch };
    setPrefs(next);
    saveAppointmentPrefs(next);
  }

  const load = async () => {
    try {
      const list = await fetchMyAppointments();
      const active = list.filter((a) => ACTIVE_STATUSES.includes(a.status));
      if (knownIds.current.size > 0) {
        for (const a of active) {
          if (!knownIds.current.has(a.id)) {
            if (prefs.toastEnabled && isChannelEnabled("appointment_new", "inapp")) {
              toast(`📅 Novo agendamento — ${fmtWhen(a.scheduled_at)}`, {
                description: APPOINTMENT_TYPES[a.type]?.label ?? "Compromisso",
              });
            }
            if (canPlaySoundNow(prefs)) {
              try { playIncomingMessageSound(); } catch { /* ignore */ }
            }
            showDesktopNotification({
              title: "Novo agendamento",
              body: `${APPOINTMENT_TYPES[a.type]?.label ?? "Compromisso"} — ${fmtWhen(a.scheduled_at)}`,
              url: `/agenda/${a.id}`,
              appointmentId: a.id,
              tag: `fixxer-appt-new-${a.id}`,
              silent: !canPlaySoundNow(prefs),
              actions: [
                { action: "open", title: "Abrir" },
                { action: "cancel", title: "Cancelar" },
              ],
            }, prefs);


          }
        }
      }
      knownIds.current = new Set(active.map((a) => a.id));
      setItems(active);

      // Carrega nomes dos contatos (proposer/invitee ≠ eu) para permitir busca por nome
      const { data: userData } = await supabaseExternal.auth.getUser();
      const meId = userData.user?.id;
      if (meId) {
        const otherIds = Array.from(new Set(active.map(a =>
          a.proposer_id === meId ? a.invitee_id : a.proposer_id
        ).filter(Boolean)));
        const missing = otherIds.filter(id => !contactsById[id]);
        if (missing.length > 0) {
          const { data } = await supabaseExternal
            .from("profiles").select("id, display_name, name").in("id", missing);
          const map = { ...contactsById };
          for (const p of data ?? []) map[p.id] = (p.display_name || p.name || "Contato") as string;
          setContactsById(map);
        }
      }
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

  useEffect(() => {
    if (!uid) return;
    const channel = supabaseExternal
      .channel(`appointments:user:${uid}`)
      .on("postgres_changes" as any,
        { event: "*", schema: "public", table: "appointments" },
        (payload: any) => {
          const row = payload.new ?? payload.old;
          if (!row) return;
          if (row.proposer_id !== uid && row.invitee_id !== uid) return;
          void load();
        })
      .subscribe();
    return () => { try { supabaseExternal.removeChannel(channel); } catch { /* ignore */ } };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uid]);

  // Lembrete configurável
  useEffect(() => {
    const key = (id: string) => `fixxer:appt-reminder:${id}:${prefs.reminderMinutes}`;
    const tick = () => {
      const now = Date.now();
      const windowMs = prefs.reminderMinutes * 60 * 1000;
      for (const a of items) {
        const t = new Date(a.scheduled_at).getTime();
        const diff = t - now;
        if (diff > 0 && diff <= windowMs) {
          try {
            if (sessionStorage.getItem(key(a.id))) continue;
            sessionStorage.setItem(key(a.id), "1");
          } catch { /* ignore */ }
          const label = APPOINTMENT_TYPES[a.type]?.label ?? "Compromisso";
          if (prefs.toastEnabled) {
            toast(`⏰ Em ${Math.max(1, Math.round(diff / 60000))}min: ${label}`, {
              description: fmtWhen(a.scheduled_at),
            });
          }
          if (canPlaySoundNow(prefs)) {
            try { playIncomingMessageSound(); } catch { /* ignore */ }
          }
          showDesktopNotification({
            title: "Compromisso próximo",
            body: `${label} — ${fmtWhen(a.scheduled_at)}`,
            url: `/agenda/${a.id}`,
            appointmentId: a.id,
            tag: `fixxer-appt-reminder-${a.id}`,
            requireInteraction: true,
            silent: !canPlaySoundNow(prefs),
            actions: [
              { action: "reschedule", title: "Reagendar" },
              { action: "cancel", title: "Cancelar" },
            ],
          }, prefs);

        }
      }
    };
    tick();
    const int = setInterval(tick, 60 * 1000);
    return () => clearInterval(int);
  }, [items, prefs]);

  // Sincroniza status de permissão quando a aba volta ao foco
  useEffect(() => {
    const onFocus = () => setDesktopPerm(desktopPermission());
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onFocus);
    return () => {
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onFocus);
    };
  }, []);

  async function handleEnableDesktop() {
    if (!desktopSupported()) {
      toast.error("Este navegador não suporta notificações.");
      return;
    }
    const p = await requestDesktopPermission();
    setDesktopPerm(p);
    if (p === "granted") {
      updatePrefs({ desktopEnabled: true });
      toast.success("Notificações do navegador ativadas — você receberá lembretes mesmo com a aba em segundo plano.");
      showDesktopNotification({
        title: "Notificações ativadas",
        body: "Você receberá lembretes dos seus agendamentos.",
        tag: "fixxer-appt-permission-ok",
        silent: true,
      }, { ...prefs, desktopEnabled: true });
    } else if (p === "denied") {
      toast.error("Permissão negada. Habilite nas configurações do navegador para receber lembretes em segundo plano.");
    }
  }


  // Reset paginação ao mudar filtros
  useEffect(() => { setPage(1); }, [range, query]);

  const filtered = useMemo(() => {
    const q = normalize(query.trim());
    return [...items]
      .filter((a) => withinRange(a, range))
      .filter((a) => {
        if (!q) return true;
        const other = a.proposer_id === uid ? a.invitee_id : a.proposer_id;
        const contactName = other ? contactsById[other] ?? "" : "";
        const hay = [
          APPOINTMENT_TYPES[a.type]?.label ?? "",
          a.location_address ?? "",
          a.notes ?? "",
          contactName,
        ].map(normalize).join(" | ");
        return hay.includes(q);
      })
      .sort((a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime());
  }, [items, range, query, uid, contactsById]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageItems = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const counts = useMemo(() => ({
    today: items.filter((a) => withinRange(a, "today")).length,
    week: items.filter((a) => withinRange(a, "week")).length,
    month: items.filter((a) => withinRange(a, "month")).length,
    future: items.filter((a) => withinRange(a, "future")).length,
  }), [items]);

  async function handleTestSound() {
    const state = await probeAutoplay();
    setAutoplay(state);
    if (state === "unavailable") {
      toast.error("Áudio indisponível neste navegador.");
      return;
    }
    try { playChatSound("ping", 1); } catch { /* ignore */ }
    if (state === "gesture-required") {
      toast.warning("Autoplay bloqueado — clique em qualquer lugar da página para liberar.");
    } else {
      toast.success("Som funcionando!");
    }
  }

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
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => updatePrefs({ pauseAllSounds: !prefs.pauseAllSounds })}
            aria-label={prefs.pauseAllSounds ? "Reativar sons" : "Pausar todos os sons"}
            title={prefs.pauseAllSounds ? "Sons pausados — clique para reativar" : "Pausar todos os sons"}
            className={`w-8 h-8 rounded-lg border flex items-center justify-center transition-all ${
              prefs.pauseAllSounds
                ? "bg-[#FF3B30]/15 border-[#FF3B30]/50 text-[#FF3B30]"
                : "bg-white/5 border-white/10 text-white/70 hover:text-white"
            }`}
          >
            {prefs.pauseAllSounds ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>
          <button
            type="button"
            onClick={() => setShowSettings((v) => !v)}
            aria-label="Configurações de agendamentos"
            aria-expanded={showSettings}
            className="w-8 h-8 rounded-lg border border-white/10 bg-white/5 text-white/70 hover:text-white flex items-center justify-center"
          >
            <Settings className="w-4 h-4" />
          </button>
          <Link
            to="/agenda"
            className="text-[10px] font-black uppercase tracking-widest text-[#00FF87] hover:text-white flex items-center gap-1"
          >
            Ver agenda <ChevronRight className="w-3 h-3" />
          </Link>
        </div>
      </header>

      {/* Painel de configurações (lembretes + acessibilidade de sons) */}
      {showSettings && (
        <div className="rounded-2xl border border-white/10 bg-black/30 p-4 space-y-4">
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-white/60">
              Antecedência do lembrete
            </label>
            <div className="flex flex-wrap gap-2">
              {REMINDER_OPTIONS.map((m) => {
                const active = prefs.reminderMinutes === m;
                return (
                  <button
                    key={m}
                    type="button"
                    onClick={() => updatePrefs({ reminderMinutes: m })}
                    className={`px-3 py-1.5 rounded-xl border text-[10px] font-black uppercase tracking-widest transition-all ${
                      active
                        ? "bg-[#00FF87]/15 border-[#00FF87] text-[#00FF87]"
                        : "bg-white/5 border-white/10 text-white hover:border-white/20"
                    }`}
                  >
                    {m} min
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <ToggleRow
              label="Som do lembrete"
              hint="Toca um alerta quando falta pouco para o compromisso"
              checked={prefs.soundEnabled}
              onChange={(v) => updatePrefs({ soundEnabled: v })}
            />
            <ToggleRow
              label="Toast na tela"
              hint="Exibe notificação flutuante no canto"
              checked={prefs.toastEnabled}
              onChange={(v) => updatePrefs({ toastEnabled: v })}
            />
            <ToggleRow
              label="Notificações do navegador"
              hint="Recebe lembretes mesmo com a aba em segundo plano"
              checked={prefs.desktopEnabled && desktopPerm === "granted"}
              onChange={(v) => {
                if (v && desktopPerm !== "granted") { void handleEnableDesktop(); return; }
                updatePrefs({ desktopEnabled: v });
              }}
            />
            <ToggleRow
              label="Respeitar sistema"
              hint="Silencia sons quando o SO pede movimento reduzido"
              checked={prefs.respectSystem}
              onChange={(v) => updatePrefs({ respectSystem: v })}
            />

            <ToggleRow
              label="Pausar todos os sons"
              hint="Mudo total (útil em reuniões)"
              checked={prefs.pauseAllSounds}
              onChange={(v) => updatePrefs({ pauseAllSounds: v })}
            />
          </div>

          {/* Não perturbe (Quiet hours) */}
          <div className="rounded-xl border border-white/10 bg-black/20 p-3 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <div>
                <div className="text-[10px] font-black uppercase tracking-widest text-white/80">
                  Não perturbe
                </div>
                <div className="text-[10px] text-white/50">
                  Silencia sons e notificações do navegador no intervalo definido
                </div>
              </div>
              <label className="inline-flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  className="sr-only peer"
                  checked={prefs.quietHoursEnabled}
                  onChange={(e) => updatePrefs({ quietHoursEnabled: e.target.checked })}
                />
                <span className="w-9 h-5 rounded-full bg-white/10 peer-checked:bg-[#00FF87]/60 relative transition-colors">
                  <span className="absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform peer-checked:translate-x-4" />
                </span>
              </label>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <label className="text-[10px] font-bold uppercase tracking-widest text-white/60">
                Início
                <input
                  type="time"
                  value={prefs.quietStart}
                  disabled={!prefs.quietHoursEnabled}
                  onChange={(e) => updatePrefs({ quietStart: e.target.value })}
                  className="mt-1 w-full bg-black/40 border border-white/10 rounded-lg px-2 py-1.5 text-white text-xs disabled:opacity-40"
                />
              </label>
              <label className="text-[10px] font-bold uppercase tracking-widest text-white/60">
                Fim
                <input
                  type="time"
                  value={prefs.quietEnd}
                  disabled={!prefs.quietHoursEnabled}
                  onChange={(e) => updatePrefs({ quietEnd: e.target.value })}
                  className="mt-1 w-full bg-black/40 border border-white/10 rounded-lg px-2 py-1.5 text-white text-xs disabled:opacity-40"
                />
              </label>
            </div>
            {prefs.quietHoursEnabled && isQuietHoursActive(prefs) && (
              <div className="text-[10px] font-black uppercase tracking-widest text-[#FF9F0A]">
                Silêncio ativo agora — nenhuma notificação será exibida
              </div>
            )}
          </div>


          <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-white/10">
            <button
              type="button"
              onClick={handleTestSound}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[#00FF87]/40 text-[#00FF87] text-[10px] font-black uppercase tracking-widest hover:bg-[#00FF87]/10"
            >
              <PlayCircle className="w-3.5 h-3.5" /> Testar som
            </button>
            {desktopSupported() && desktopPerm !== "granted" && (
              <button
                type="button"
                onClick={handleEnableDesktop}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[#FF9F0A]/50 text-[#FF9F0A] text-[10px] font-black uppercase tracking-widest hover:bg-[#FF9F0A]/10"
              >
                <Bell className="w-3.5 h-3.5" />
                {desktopPerm === "denied" ? "Notificações bloqueadas" : "Ativar notificações do navegador"}
              </button>
            )}
            <span className={`text-[10px] font-bold uppercase tracking-widest ${
              desktopPerm === "granted" ? "text-[#00FF87]" :
              desktopPerm === "denied" ? "text-[#FF3B30]" :
              desktopPerm === "unsupported" ? "text-white/40" : "text-white/60"
            }`}>
              {desktopPerm === "granted" && "Navegador: liberado"}
              {desktopPerm === "denied" && "Navegador: bloqueado"}
              {desktopPerm === "default" && "Navegador: aguardando permissão"}
              {desktopPerm === "unsupported" && "Navegador: sem suporte"}
            </span>
            {autoplay !== "unknown" && (
              <span className={`text-[10px] font-bold uppercase tracking-widest ${
                autoplay === "granted" ? "text-[#00FF87]" :
                autoplay === "gesture-required" ? "text-[#FF9F0A]" : "text-[#FF3B30]"
              }`}>
                {autoplay === "granted" && "Autoplay: liberado"}
                {autoplay === "gesture-required" && "Autoplay: precisa de interação"}
                {autoplay === "unavailable" && "Autoplay: indisponível"}
              </span>
            )}
          </div>

        </div>
      )}

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

      {/* Busca */}
      <div className="relative">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-white/40 pointer-events-none" />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar por contato, serviço, local…"
          aria-label="Buscar agendamentos"
          className="w-full pl-9 pr-3 py-2 rounded-xl bg-black/40 border border-white/10 text-sm text-white placeholder:text-white/40 focus:outline-none focus:border-[#00FF87]/50"
        />
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
            {query
              ? `Nenhum resultado para "${query}".`
              : `Nenhum compromisso ${RANGE_LABELS[range].toLowerCase()}.`}
          </p>
          <Link
            to="/agenda"
            className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-[#00FF87] hover:text-white"
          >
            <Bell className="w-3 h-3" /> Configurar agenda
          </Link>
        </div>
      ) : (
        <>
          <ul className="space-y-2">
            {pageItems.map((a) => {
              const s = APPOINTMENT_STATUS[a.status];
              const t = APPOINTMENT_TYPES[a.type];
              const other = a.proposer_id === uid ? a.invitee_id : a.proposer_id;
              const contactName = other ? contactsById[other] : null;
              return (
                <li key={a.id}>
                  <button
                    type="button"
                    onClick={() => setDetailsOf(a)}
                    className="w-full text-left flex items-center gap-3 p-3 rounded-xl border border-white/10 bg-white/5 hover:border-[#00FF87]/40 hover:bg-white/10 transition-all group"
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
                      <div className="flex items-center gap-3 text-[10px] text-muted-foreground mt-0.5 flex-wrap">
                        <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{fmtWhen(a.scheduled_at)}</span>
                        {contactName && <span className="truncate">👤 {contactName}</span>}
                        {a.location_address && (
                          <span className="flex items-center gap-1 truncate">
                            <MapPin className="w-3 h-3" />{a.location_address}
                          </span>
                        )}
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-[#00FF87]" />
                  </button>
                </li>
              );
            })}
          </ul>

          {/* Paginação */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-2 border-t border-white/10">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-white/70 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-3 h-3" /> Anterior
              </button>
              <span className="text-[10px] font-bold uppercase tracking-widest text-white/50">
                Página {page} de {totalPages} · {filtered.length} resultado(s)
              </span>
              <button
                type="button"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-white/70 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Próxima <ChevronRight className="w-3 h-3" />
              </button>
            </div>
          )}
        </>
      )}

      <AppointmentDetailsModal
        appointment={detailsOf}
        open={!!detailsOf}
        onOpenChange={(v) => { if (!v) setDetailsOf(null); }}
        onChanged={() => { void load(); }}
      />
    </section>
  );
}

function ToggleRow({
  label, hint, checked, onChange,
}: { label: string; hint?: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-start gap-3 p-3 rounded-xl border border-white/10 bg-white/5 cursor-pointer hover:border-white/20">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-1 accent-[#00FF87]"
      />
      <div className="flex-1 min-w-0">
        <div className="text-xs font-black text-white uppercase tracking-tight">{label}</div>
        {hint && <div className="text-[10px] text-white/50 mt-0.5">{hint}</div>}
      </div>
    </label>
  );
}

export default MyAppointmentsSection;
