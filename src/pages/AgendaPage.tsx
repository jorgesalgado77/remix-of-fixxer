import { useEffect, useMemo, useState, useCallback } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
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
  const navigate = useNavigate();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [monthCursor, setMonthCursor] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });
  const [filterStatus, setFilterStatus] = useState<AppointmentStatus | "all">("all");
  const [busy, setBusy] = useState<string | null>(null);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
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
          onSelectDay={setSelectedDay}
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
                onOpen={() => navigate({ to: "/agenda/$id", params: { id: a.id } })}
                onAccept={() => withBusy(a.id, async () => { await acceptAppointment(a.id); toast.success("Confirmado!"); })}
                onCancel={() => {
                  const reason = window.prompt("Motivo do cancelamento (opcional):", "") ?? undefined;
                  void withBusy(a.id, async () => {
                    const r = await cancelAppointment(a.id, reason || undefined);
                    if (r.refunded) toast.success(`Cancelado. Sinal reembolsado (R$ ${r.amount?.toFixed(2) ?? "0,00"}).`);
                    else toast("Compromisso cancelado.");
                  });
                }}
                onCheckIn={() => setPhotoModal({ appointment: a, mode: "checkin" })}
                onCheckOut={() => setPhotoModal({ appointment: a, mode: "checkout" })}
              />
            ))}
          </div>
        )}
      </div>

      {selectedDay && (
        <DayDetailModal
          dayISO={selectedDay}
          appointments={dotsByDay.get(selectedDay) ?? []}
          accent={theme.hex}
          onClose={() => setSelectedDay(null)}
          onOpenAppointment={(a) => {
            setSelectedDay(null);
            navigate({ to: "/agenda/$id", params: { id: a.id } });
          }}
        />
      )}

      {photoModal && (
        <CheckoutPhotosModal
          open={!!photoModal}
          onClose={() => setPhotoModal(null)}
          appointmentId={photoModal.appointment.id}
          serviceTitle={APPOINTMENT_TYPES[photoModal.appointment.type]?.label}
          mode={photoModal.mode}
          minPhotos={photoModal.mode === "checkout" ? 1 : 0}
          onConfirm={async (urls) => {
            if (photoModal.mode === "checkin") {
              await checkIn(photoModal.appointment.id, urls);
              toast.success("📍 Check-in registrado!");
            } else {
              await checkOut(photoModal.appointment.id, urls);
              toast.success("🏁 Check-out concluído. Custódia liberada.");
            }
          }}
        />
      )}
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
  onSelectDay,
}: {
  cursor: Date;
  onChange: (d: Date) => void;
  dots: Map<string, Appointment[]>;
  accent: string;
  onSelectDay: (iso: string) => void;
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

  // Dias da semana com cores vibrantes distintas
  const weekDays: { label: string; full: string; color: string }[] = [
    { label: "Dom", full: "Domingo", color: "#FF4D6D" },
    { label: "Seg", full: "Segunda", color: "#FFB020" },
    { label: "Ter", full: "Terça", color: "#FFD600" },
    { label: "Qua", full: "Quarta", color: "#00E5A0" },
    { label: "Qui", full: "Quinta", color: "#38BDF8" },
    { label: "Sex", full: "Sexta", color: "#A855F7" },
    { label: "Sáb", full: "Sábado", color: "#F472B6" },
  ];

  return (
    <div
      className="rounded-3xl border border-white/10 p-4 shadow-2xl"
      style={{
        background: `radial-gradient(circle at top left, ${accent}18, transparent 60%), linear-gradient(180deg, #17171A 0%, #0F0F11 100%)`,
      }}
    >
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={() => onChange(new Date(year, month - 1, 1))}
          className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 transition"
          aria-label="Mês anterior"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <div className="text-center">
          <div className="text-[9px] font-black uppercase tracking-[0.3em] text-white/40">Agenda</div>
          <div className="text-base font-black uppercase tracking-tight capitalize" style={{ color: accent }}>
            {monthLabel}
          </div>
        </div>
        <button
          onClick={() => onChange(new Date(year, month + 1, 1))}
          className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 transition"
          aria-label="Próximo mês"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1.5 text-center mb-2">
        {weekDays.map((w) => (
          <div
            key={w.full}
            className="text-[10px] font-black uppercase tracking-widest py-1.5 rounded-lg"
            style={{ color: w.color, backgroundColor: `${w.color}15` }}
            title={w.full}
          >
            {w.label}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1.5 text-center">
        {cells.map((d, i) => {
          if (d === null) return <div key={i} className="aspect-square" />;
          const dayISO = new Date(year, month, d).toISOString().slice(0, 10);
          const dayAppts = dots.get(dayISO) ?? [];
          const isToday = dayISO === today;
          const weekday = new Date(year, month, d).getDay();
          const wColor = weekDays[weekday].color;
          const hasAppts = dayAppts.length > 0;
          return (
            <button
              key={i}
              onClick={() => onSelectDay(dayISO)}
              className="group aspect-square rounded-xl flex flex-col items-center justify-center relative transition-all hover:scale-[1.05] active:scale-95"
              style={{
                backgroundColor: isToday
                  ? `${accent}30`
                  : hasAppts
                    ? `${wColor}12`
                    : "rgba(255,255,255,0.02)",
                border: isToday
                  ? `1.5px solid ${accent}`
                  : hasAppts
                    ? `1px solid ${wColor}55`
                    : "1px solid rgba(255,255,255,0.05)",
                boxShadow: isToday ? `0 0 16px ${accent}55` : undefined,
              }}
              aria-label={`Dia ${d}, ${dayAppts.length} compromisso(s)`}
            >
              <span
                className="text-[13px] font-black leading-none"
                style={{ color: isToday ? accent : hasAppts ? "#fff" : "rgba(255,255,255,0.65)" }}
              >
                {d}
              </span>
              {hasAppts && (
                <div className="flex gap-0.5 mt-1">
                  {dayAppts.slice(0, 3).map((a) => (
                    <div
                      key={a.id}
                      className="w-1.5 h-1.5 rounded-full"
                      style={{
                        backgroundColor: APPOINTMENT_STATUS[a.status].color,
                        boxShadow: `0 0 4px ${APPOINTMENT_STATUS[a.status].color}`,
                      }}
                    />
                  ))}
                  {dayAppts.length > 3 && (
                    <span className="text-[7px] font-black text-white/60 ml-0.5">
                      +{dayAppts.length - 3}
                    </span>
                  )}
                </div>
              )}
            </button>
          );
        })}
      </div>

      <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-center gap-3 text-[9px] font-black uppercase tracking-widest text-white/40">
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: accent }} /> Hoje
        </span>
        <span>•</span>
        <span>Toque em um dia para ver horários</span>
      </div>
    </div>
  );
}

function DayDetailModal({
  dayISO,
  appointments,
  accent,
  onClose,
  onOpenAppointment,
}: {
  dayISO: string;
  appointments: Appointment[];
  accent: string;
  onClose: () => void;
  onOpenAppointment: (a: Appointment) => void;
}) {
  const [y, m, d] = dayISO.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  const dateLabel = date.toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  // Agrupa por hora (00 a 23)
  const byHour = new Map<number, Appointment[]>();
  for (const a of appointments) {
    const h = new Date(a.scheduled_at).getHours();
    if (!byHour.has(h)) byHour.set(h, []);
    byHour.get(h)!.push(a);
  }

  const hours = Array.from({ length: 24 }, (_, i) => i);
  const workingHours = hours.filter((h) => h >= 7 && h <= 22);

  return (
    <div
      className="fixed inset-0 z-[70] bg-black/80 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-6"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="w-full sm:max-w-lg max-h-[85vh] rounded-t-3xl sm:rounded-3xl border border-white/10 bg-[#101013] overflow-hidden flex flex-col"
        style={{ boxShadow: `0 -20px 60px ${accent}22` }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="px-5 py-4 border-b border-white/10 flex items-center gap-3"
          style={{ background: `linear-gradient(135deg, ${accent}22, transparent)` }}
        >
          <div
            className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0"
            style={{ backgroundColor: `${accent}22`, border: `1px solid ${accent}55` }}
          >
            <CalendarIcon className="w-5 h-5" style={{ color: accent }} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-[9px] font-black uppercase tracking-widest text-white/40">
              Detalhes do Dia
            </div>
            <div className="text-sm font-black capitalize truncate">{dateLabel}</div>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10"
            aria-label="Fechar"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 p-4 space-y-2">
          {appointments.length === 0 && (
            <div className="text-center py-6 space-y-2">
              <Clock className="w-8 h-8 mx-auto text-white/20" />
              <p className="text-xs font-bold text-white/60">
                Nenhum compromisso fixado neste dia.
              </p>
              <p className="text-[10px] text-white/40">
                Horários livres exibidos abaixo.
              </p>
            </div>
          )}

          {workingHours.map((h) => {
            const slot = byHour.get(h) ?? [];
            const label = `${String(h).padStart(2, "0")}:00`;
            return (
              <div
                key={h}
                className="grid grid-cols-[56px_1fr] gap-3 items-start"
              >
                <div className="pt-2 text-right">
                  <span className="text-[10px] font-black uppercase tracking-widest text-white/40">
                    {label}
                  </span>
                </div>
                <div className="min-h-[44px] rounded-xl border border-white/5 bg-white/[0.02] p-2 space-y-1.5">
                  {slot.length === 0 ? (
                    <div className="h-full flex items-center px-2">
                      <span className="text-[10px] text-white/25 italic">Livre</span>
                    </div>
                  ) : (
                    slot.map((a) => {
                      const s = APPOINTMENT_STATUS[a.status];
                      const t = APPOINTMENT_TYPES[a.type];
                      const time = new Date(a.scheduled_at).toLocaleTimeString("pt-BR", {
                        hour: "2-digit",
                        minute: "2-digit",
                      });
                      return (
                        <button
                          key={a.id}
                          onClick={() => onOpenAppointment(a)}
                          className="w-full text-left rounded-lg p-2.5 flex items-center gap-2 hover:brightness-125 transition"
                          style={{
                            backgroundColor: `${s.color}18`,
                            border: `1px solid ${s.color}55`,
                          }}
                        >
                          <span className="text-lg shrink-0">{t.icon}</span>
                          <div className="min-w-0 flex-1">
                            <div className="text-[11px] font-black uppercase truncate">
                              {t.label}
                            </div>
                            <div className="text-[10px] text-white/60 truncate">
                              {time} • {s.icon} {s.label}
                            </div>
                          </div>
                        </button>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <div
          className="px-5 py-3 border-t border-white/10 text-center text-[9px] font-black uppercase tracking-widest text-white/40"
          style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 12px)" }}
        >
          {appointments.length} compromisso(s) neste dia
        </div>
      </div>
    </div>
  );
}


function AppointmentCard({
  appointment,
  userId,
  busy,
  onOpen,
  onAccept,
  onCancel,
  onCheckIn,
  onCheckOut,
}: {
  appointment: Appointment;
  userId: string | null;
  busy: boolean;
  onOpen: () => void;
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
      <button
        onClick={onOpen}
        className="w-full text-left p-4 space-y-3 hover:bg-white/[0.02] transition-colors"
      >
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
      </button>

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
