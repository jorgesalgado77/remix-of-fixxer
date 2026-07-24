import { useEffect, useMemo, useState, useCallback } from "react";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import {
  Calendar as CalendarIcon,
  MapPin,
  ArrowLeft,
  Navigation,
  CheckCircle2,
  Camera,
  Loader2,
  RefreshCw,
  X,
  Clock,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { supabaseExternal } from "@/lib/supabaseExternal";
import {
  fetchMyAppointments,
  acceptAppointment,
  cancelAppointment,
  checkIn,
  checkOut,
  openRoute,
  APPOINTMENT_TYPES,
  APPOINTMENT_STATUS,
  type Appointment,
  type AppointmentStatus,
} from "@/lib/appointments";
import { useCurrentCategory } from "@/lib/user-category";
import { getCategoryTheme, CATEGORY_COLORS } from "@/lib/category-colors";
import { CheckoutPhotosModal } from "@/components/CheckoutPhotosModal";

export default function AgendaPage() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [monthCursor, setMonthCursor] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });
  const [filterStatus, setFilterStatus] = useState<AppointmentStatus | "all">("all");
  const [busy, setBusy] = useState<string | null>(null);
  const [photoModal, setPhotoModal] = useState<
    { appointment: Appointment; mode: "checkin" | "checkout" } | null
  >(null);

  const category = useCurrentCategory();
  const theme = getCategoryTheme(category);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const list = await fetchMyAppointments();
      setAppointments(list);
    } catch (e: any) {
      toast.error("Falha ao carregar agenda", { description: e?.message });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    supabaseExternal.auth.getUser().then(({ data }) => setUserId(data.user?.id ?? null));
    load();
  }, [load]);

  // Realtime
  useEffect(() => {
    if (!userId) return;
    const ch = supabaseExternal
      .channel(`appointments:${userId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "appointments" },
        () => load(),
      )
      .subscribe();
    return () => {
      supabaseExternal.removeChannel(ch);
    };
  }, [userId, load]);

  const filtered = useMemo(() => {
    if (filterStatus === "all") return appointments;
    return appointments.filter((a) => a.status === filterStatus);
  }, [appointments, filterStatus]);

  const dotsByDay = useMemo(() => {
    const map = new Map<string, Appointment[]>();
    for (const a of appointments) {
      const day = a.scheduled_at.slice(0, 10);
      if (!map.has(day)) map.set(day, []);
      map.get(day)!.push(a);
    }
    return map;
  }, [appointments]);

  const withBusy = async (id: string, fn: () => Promise<void>) => {
    try {
      setBusy(id);
      await fn();
    } catch (e: any) {
      toast.error("Ação falhou", { description: e?.message });
    } finally {
      setBusy(null);
    }
  };

  return (
    <div
      className="min-h-screen bg-[#0A0A0B] text-white pb-32"
      style={{ paddingTop: "env(safe-area-inset-top)" }}
    >
      {/* Header */}
      <header className="sticky top-0 z-30 bg-[#0A0A0B]/95 backdrop-blur-md border-b border-white/10 p-4">
        <div className="max-w-3xl mx-auto grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3">
          <Link
            to="/dashboard"
            className="w-10 h-10 shrink-0 bg-[#1A1A1B] border border-white/10 rounded-xl flex items-center justify-center text-white/70"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="min-w-0">
            <h1 className="text-lg font-black uppercase tracking-tighter truncate flex items-center gap-2">
              <CalendarIcon className="w-5 h-5" style={{ color: theme.hex }} />
              Minha Agenda
            </h1>
            <p className="text-[10px] text-white/50 truncate">
              {appointments.length} compromisso(s)
            </p>
          </div>
          <button
            onClick={load}
            className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center"
            aria-label="Recarregar"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </header>

      <div className="max-w-3xl mx-auto p-4 space-y-6">
        {/* Calendário */}
        <MonthCalendar
          cursor={monthCursor}
          onChange={setMonthCursor}
          dots={dotsByDay}
          accent={theme.hex}
        />

        {/* Filtros de status */}
        <div className="flex gap-2 overflow-x-auto scrollbar-none -mx-4 px-4">
          <FilterChip
            label="Todos"
            active={filterStatus === "all"}
            onClick={() => setFilterStatus("all")}
            accent={theme.hex}
          />
          {(Object.keys(APPOINTMENT_STATUS) as AppointmentStatus[]).map((s) => (
            <FilterChip
              key={s}
              label={`${APPOINTMENT_STATUS[s].icon} ${APPOINTMENT_STATUS[s].label}`}
              active={filterStatus === s}
              onClick={() => setFilterStatus(s)}
              accent={APPOINTMENT_STATUS[s].color}
            />
          ))}
        </div>

        {/* Lista */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-white/40" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 space-y-3">
            <CalendarIcon className="w-12 h-12 mx-auto text-white/20" />
            <p className="text-sm font-bold text-white/60">Nenhum compromisso nesta visão.</p>
            <p className="text-[11px] text-white/40">
              Proponha um agendamento pelo chat com um lojista/prestador.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((a) => (
              <AppointmentCard
                key={a.id}
                appointment={a}
                userId={userId}
                busy={busy === a.id}
                onAccept={() => withBusy(a.id, () => acceptAppointment(a.id).then(() => { toast.success("Confirmado!"); }))}
                onCancel={() => withBusy(a.id, () => cancelAppointment(a.id).then(() => { toast("Cancelado."); }))}
                onCheckIn={() => withBusy(a.id, () => checkIn(a.id).then(() => { toast.success("📍 Check-in registrado!"); }))}
                onCheckOut={() => withBusy(a.id, () => checkOut(a.id, []).then(() => { toast.success("🏁 Check-out concluído. Custódia liberada."); }))}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================
// Sub-componentes
// ============================================================

function FilterChip({
  label,
  active,
  onClick,
  accent,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  accent: string;
}) {
  return (
    <button
      onClick={onClick}
      className="shrink-0 px-3 py-1.5 rounded-full text-[10px] font-black uppercase whitespace-nowrap transition-all"
      style={{
        backgroundColor: active ? accent : "rgba(255,255,255,0.05)",
        color: active ? "#000" : "rgba(255,255,255,0.7)",
        border: `1px solid ${active ? accent : "rgba(255,255,255,0.1)"}`,
      }}
    >
      {label}
    </button>
  );
}

function MonthCalendar({
  cursor,
  onChange,
  dots,
  accent,
}: {
  cursor: Date;
  onChange: (d: Date) => void;
  dots: Map<string, Appointment[]>;
  accent: string;
}) {
  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startOffset = firstDay.getDay();
  const daysInMonth = lastDay.getDate();
  const cells: (number | null)[] = [];
  for (let i = 0; i < startOffset; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const monthLabel = firstDay.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="rounded-2xl border border-white/10 bg-[#1A1A1B] p-4">
      <div className="flex items-center justify-between mb-3">
        <button
          onClick={() => onChange(new Date(year, month - 1, 1))}
          className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center"
          aria-label="Mês anterior"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <div className="text-sm font-black uppercase tracking-tight">{monthLabel}</div>
        <button
          onClick={() => onChange(new Date(year, month + 1, 1))}
          className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center"
          aria-label="Próximo mês"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center">
        {["D", "S", "T", "Q", "Q", "S", "S"].map((d, i) => (
          <div key={i} className="text-[9px] font-black text-white/40 py-1">{d}</div>
        ))}
        {cells.map((d, i) => {
          if (d === null) return <div key={i} />;
          const dayISO = new Date(year, month, d).toISOString().slice(0, 10);
          const dayAppts = dots.get(dayISO) ?? [];
          const isToday = dayISO === today;
          return (
            <div
              key={i}
              className="aspect-square rounded-lg flex flex-col items-center justify-center relative"
              style={{
                backgroundColor: isToday ? `${accent}22` : "transparent",
                border: isToday ? `1px solid ${accent}55` : "1px solid transparent",
              }}
            >
              <span className="text-[11px] font-bold text-white/80">{d}</span>
              {dayAppts.length > 0 && (
                <div className="flex gap-0.5 mt-0.5">
                  {dayAppts.slice(0, 3).map((a) => (
                    <div
                      key={a.id}
                      className="w-1 h-1 rounded-full"
                      style={{ backgroundColor: APPOINTMENT_STATUS[a.status].color }}
                    />
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function AppointmentCard({
  appointment,
  userId,
  busy,
  onAccept,
  onCancel,
  onCheckIn,
  onCheckOut,
}: {
  appointment: Appointment;
  userId: string | null;
  busy: boolean;
  onAccept: () => void;
  onCancel: () => void;
  onCheckIn: () => void;
  onCheckOut: () => void;
}) {
  const s = APPOINTMENT_STATUS[appointment.status];
  const t = APPOINTMENT_TYPES[appointment.type];
  const dt = new Date(appointment.scheduled_at);
  const dateLabel = dt.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
  const timeLabel = dt.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });

  const isInvitee = userId === appointment.invitee_id;
  const canAccept = isInvitee && (appointment.status === "pending" || appointment.status === "rescheduled");
  const canCheckIn = appointment.status === "confirmed";
  const canCheckOut = appointment.status === "checked_in";
  const canCancel = ["pending", "confirmed", "rescheduled"].includes(appointment.status);

  return (
    <div
      className="rounded-2xl border bg-[#1A1A1B] overflow-hidden"
      style={{ borderColor: `${s.color}44` }}
    >
      <div className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-lg shrink-0">{t.icon}</span>
              <span className="text-xs font-black uppercase truncate">{t.label}</span>
            </div>
            <div className="flex items-center gap-3 text-[11px] text-white/60">
              <span className="flex items-center gap-1">
                <CalendarIcon className="w-3 h-3" />
                {dateLabel}
              </span>
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {timeLabel}
              </span>
            </div>
          </div>
          <span
            className="shrink-0 text-[9px] font-black px-2 py-1 rounded-full"
            style={{ backgroundColor: `${s.color}22`, color: s.color }}
          >
            {s.icon} {s.label}
          </span>
        </div>

        {appointment.location_address && (
          <div className="flex items-start gap-2 text-[11px] text-white/70">
            <MapPin className="w-3 h-3 mt-0.5 shrink-0" />
            <span className="line-clamp-2">{appointment.location_address}</span>
          </div>
        )}

        {appointment.deposit_amount > 0 && (
          <div className="text-[10px] font-black uppercase tracking-widest text-white/50">
            💰 Sinal em custódia:{" "}
            <span className="text-white">
              R$ {appointment.deposit_amount.toFixed(2).replace(".", ",")}
            </span>
          </div>
        )}

        {appointment.notes && (
          <p className="text-[11px] text-white/60 italic line-clamp-3">{appointment.notes}</p>
        )}
      </div>

      {/* Ações */}
      <div className="flex flex-wrap gap-2 p-3 border-t border-white/5 bg-black/20">
        {(appointment.location_address || (appointment.location_lat && appointment.location_lng)) && (
          <button
            onClick={() =>
              openRoute(appointment.location_address, appointment.location_lat, appointment.location_lng)
            }
            className="flex-1 min-w-[100px] py-2 rounded-lg bg-white/5 text-[10px] font-black uppercase flex items-center justify-center gap-1"
          >
            <Navigation className="w-3 h-3" /> Rota
          </button>
        )}
        {canAccept && (
          <button
            disabled={busy}
            onClick={onAccept}
            className="flex-1 min-w-[100px] py-2 rounded-lg text-[10px] font-black uppercase flex items-center justify-center gap-1 disabled:opacity-50"
            style={{ backgroundColor: "#00FF87", color: "#000" }}
          >
            <CheckCircle2 className="w-3 h-3" /> Aceitar
          </button>
        )}
        {canCheckIn && (
          <button
            disabled={busy}
            onClick={onCheckIn}
            className="flex-1 min-w-[100px] py-2 rounded-lg text-[10px] font-black uppercase flex items-center justify-center gap-1 disabled:opacity-50"
            style={{ backgroundColor: "#A855F7", color: "#000" }}
          >
            <MapPin className="w-3 h-3" /> Check-in
          </button>
        )}
        {canCheckOut && (
          <button
            disabled={busy}
            onClick={onCheckOut}
            className="flex-1 min-w-[100px] py-2 rounded-lg text-[10px] font-black uppercase flex items-center justify-center gap-1 disabled:opacity-50"
            style={{ backgroundColor: "#FFD600", color: "#000" }}
          >
            <Camera className="w-3 h-3" /> Check-out
          </button>
        )}
        {canCancel && (
          <button
            disabled={busy}
            onClick={onCancel}
            className="py-2 px-3 rounded-lg bg-white/5 text-[10px] font-black uppercase flex items-center gap-1 disabled:opacity-50"
          >
            <X className="w-3 h-3" />
          </button>
        )}
        {busy && <Loader2 className="w-4 h-4 animate-spin text-white/40 self-center" />}
      </div>
    </div>
  );
}
