import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import {
  CalendarClock,
  CheckCircle2,
  RefreshCw,
  MapPin,
  Loader2,
  Camera,
} from "lucide-react";
import { supabaseExternal } from "@/lib/supabaseExternal";
import {
  acceptAppointment,
  proposeReschedule,
  checkIn,
  checkOut,
  APPOINTMENT_STATUS,
  APPOINTMENT_TYPES,
  type Appointment,
} from "@/lib/appointments";
import { CheckoutPhotosModal } from "@/components/CheckoutPhotosModal";

type Props = {
  userId: string | null;
  peerId: string;
};

export function ChatAppointmentsBanner({ userId, peerId }: Props) {
  const [items, setItems] = useState<Appointment[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [rescheduleFor, setRescheduleFor] = useState<Appointment | null>(null);
  const [rescheduleDate, setRescheduleDate] = useState("");
  const [rescheduleTime, setRescheduleTime] = useState("");
  const [photoModal, setPhotoModal] = useState<
    { appointment: Appointment; mode: "checkin" | "checkout" } | null
  >(null);

  const load = useCallback(async () => {
    if (!userId) return;
    const { data, error } = await supabaseExternal
      .from("appointments")
      .select("*")
      .or(
        `and(proposer_id.eq.${userId},invitee_id.eq.${peerId}),and(proposer_id.eq.${peerId},invitee_id.eq.${userId})`,
      )
      .in("status", ["pending", "rescheduled", "confirmed", "checked_in"])
      .order("scheduled_at", { ascending: true });
    if (error) {
      // silencioso — tabela pode ainda não existir em ambientes iniciais
      return;
    }
    setItems((data ?? []) as Appointment[]);
  }, [userId, peerId]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!userId) return;
    const ch = supabaseExternal
      .channel(`appointments-chat:${userId}:${peerId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "appointments" },
        () => load(),
      )
      .subscribe();
    return () => {
      supabaseExternal.removeChannel(ch);
    };
  }, [userId, peerId, load]);

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

  const submitReschedule = () => {
    if (!rescheduleFor) return;
    if (!rescheduleDate || !rescheduleTime) {
      toast.error("Informe data e horário.");
      return;
    }
    const iso = new Date(`${rescheduleDate}T${rescheduleTime}:00`).toISOString();
    const id = rescheduleFor.id;
    withBusy(id, () =>
      proposeReschedule(id, iso).then(() => {
        toast.success("🔄 Novo horário proposto!");
        setRescheduleFor(null);
        setRescheduleDate("");
        setRescheduleTime("");
      }),
    );
  };

  if (!userId || items.length === 0) return null;

  return (
    <>
      <div className="space-y-2">
        {items.map((a) => {
          const s = APPOINTMENT_STATUS[a.status];
          const t = APPOINTMENT_TYPES[a.type];
          const dt = new Date(a.scheduled_at);
          const when = dt.toLocaleString("pt-BR", {
            day: "2-digit",
            month: "short",
            hour: "2-digit",
            minute: "2-digit",
          });
          const isInvitee = a.invitee_id === userId;
          const canAccept = isInvitee && (a.status === "pending" || a.status === "rescheduled");
          const canReschedule = ["pending", "rescheduled", "confirmed"].includes(a.status);
          const canCheckIn = a.status === "confirmed";
          const canCheckOut = a.status === "checked_in";

          return (
            <div
              key={a.id}
              className="rounded-2xl border bg-[#111112]/95 backdrop-blur-sm p-3 space-y-2"
              style={{ borderColor: `${s.color}55` }}
            >
              <div className="flex items-start gap-2">
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center text-base shrink-0"
                  style={{ backgroundColor: `${s.color}22` }}
                >
                  {t.icon}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] font-black uppercase tracking-tight truncate">
                    {t.label}
                  </p>
                  <p className="text-[10px] text-white/60 flex items-center gap-2 flex-wrap">
                    <span className="flex items-center gap-1">
                      <CalendarClock className="w-3 h-3" /> {when}
                    </span>
                    {a.location_address && (
                      <span className="flex items-center gap-1 truncate max-w-[180px]">
                        <MapPin className="w-3 h-3 shrink-0" />
                        <span className="truncate">{a.location_address}</span>
                      </span>
                    )}
                  </p>
                </div>
                <span
                  className="shrink-0 text-[9px] font-black px-2 py-0.5 rounded-full whitespace-nowrap"
                  style={{ backgroundColor: `${s.color}22`, color: s.color }}
                >
                  {s.icon} {s.label}
                </span>
              </div>

              <div className="flex flex-wrap gap-1.5">
                {canAccept && (
                  <button
                    disabled={busy === a.id}
                    onClick={() =>
                      withBusy(a.id, () =>
                        acceptAppointment(a.id).then(() => toast.success("✅ Aceito e agendado!")),
                      )
                    }
                    className="flex-1 min-w-[130px] py-2 rounded-lg text-[10px] font-black uppercase flex items-center justify-center gap-1 disabled:opacity-40"
                    style={{ backgroundColor: "#00FF87", color: "#000" }}
                  >
                    <CheckCircle2 className="w-3 h-3" /> Aceitar e Agendar
                  </button>
                )}
                {canReschedule && (
                  <button
                    disabled={busy === a.id}
                    onClick={() => {
                      setRescheduleFor(a);
                      const d = new Date(a.scheduled_at);
                      setRescheduleDate(d.toISOString().slice(0, 10));
                      setRescheduleTime(
                        `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`,
                      );
                    }}
                    className="flex-1 min-w-[130px] py-2 rounded-lg text-[10px] font-black uppercase flex items-center justify-center gap-1 bg-white/5 border border-white/15 disabled:opacity-40"
                    style={{ color: "#00E5FF" }}
                  >
                    <RefreshCw className="w-3 h-3" /> Sugerir Horário
                  </button>
                )}
                {canCheckIn && (
                  <button
                    disabled={busy === a.id}
                    onClick={() => setPhotoModal({ appointment: a, mode: "checkin" })}
                    className="flex-1 min-w-[110px] py-2 rounded-lg text-[10px] font-black uppercase flex items-center justify-center gap-1 disabled:opacity-40"
                    style={{ backgroundColor: "#A855F7", color: "#000" }}
                  >
                    <MapPin className="w-3 h-3" /> Check-in
                  </button>
                )}
                {canCheckOut && (
                  <button
                    disabled={busy === a.id}
                    onClick={() => setPhotoModal({ appointment: a, mode: "checkout" })}
                    className="flex-1 min-w-[110px] py-2 rounded-lg text-[10px] font-black uppercase flex items-center justify-center gap-1 disabled:opacity-40"
                    style={{ backgroundColor: "#FFD600", color: "#000" }}
                  >
                    <Camera className="w-3 h-3" /> Check-out
                  </button>
                )}
                {busy === a.id && (
                  <Loader2 className="w-4 h-4 animate-spin text-white/40 self-center" />
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal de reagendamento */}
      {rescheduleFor && (
        <div
          className="fixed inset-0 z-[105] bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center"
          onClick={() => setRescheduleFor(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full sm:max-w-sm bg-[#0A0A0B] border border-white/10 rounded-t-3xl sm:rounded-3xl p-4 space-y-4"
            style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 16px)" }}
          >
            <div>
              <h3 className="text-sm font-black uppercase tracking-tight flex items-center gap-2">
                <RefreshCw className="w-4 h-4" style={{ color: "#00E5FF" }} />
                Sugerir Novo Horário
              </h3>
              <p className="text-[10px] text-white/50 mt-1">
                A contraparte será notificada e poderá aceitar o novo horário.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] font-black uppercase text-white/60">Data</label>
                <input
                  type="date"
                  value={rescheduleDate}
                  onChange={(e) => setRescheduleDate(e.target.value)}
                  className="w-full mt-1 bg-[#1A1A1B] border border-white/10 rounded-lg px-3 py-2 text-sm text-white"
                />
              </div>
              <div>
                <label className="text-[10px] font-black uppercase text-white/60">Horário</label>
                <input
                  type="time"
                  value={rescheduleTime}
                  onChange={(e) => setRescheduleTime(e.target.value)}
                  className="w-full mt-1 bg-[#1A1A1B] border border-white/10 rounded-lg px-3 py-2 text-sm text-white"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setRescheduleFor(null)}
                className="flex-1 py-2.5 rounded-lg bg-white/5 border border-white/10 text-[10px] font-black uppercase tracking-widest text-white/70"
              >
                Cancelar
              </button>
              <button
                onClick={submitReschedule}
                disabled={busy === rescheduleFor.id}
                className="flex-1 py-2.5 rounded-lg text-[10px] font-black uppercase tracking-widest disabled:opacity-40"
                style={{ backgroundColor: "#00E5FF", color: "#000" }}
              >
                {busy === rescheduleFor.id ? "Enviando…" : "Confirmar"}
              </button>
            </div>
          </div>
        </div>
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
    </>
  );
}
