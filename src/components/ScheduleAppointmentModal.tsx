import { useState } from "react";
import { X, Calendar as CalendarIcon, MapPin, DollarSign, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { createAppointment, APPOINTMENT_TYPES, type AppointmentType } from "@/lib/appointments";
import { CurrencyInputBRL } from "@/components/CurrencyInputBRL";
import { parseCurrencyBRL } from "@/lib/currency-brl";

type Props = {
  open: boolean;
  onClose: () => void;
  peerId: string;
  peerName?: string;
  defaultAddress?: string;
  orderId?: string;
  chatThreadId?: string;
  onCreated?: (appointmentId: string) => void;
};

export function ScheduleAppointmentModal({
  open,
  onClose,
  peerId,
  peerName,
  defaultAddress,
  orderId,
  chatThreadId,
  onCreated,
}: Props) {
  const [type, setType] = useState<AppointmentType>("visita_tecnica");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [address, setAddress] = useState(defaultAddress || "");
  const [deposit, setDeposit] = useState(0);
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);

  if (!open) return null;

  const submit = async () => {
    if (!date || !time) {
      toast.error("Informe data e horário.");
      return;
    }
    try {
      setLoading(true);
      const scheduled_at = new Date(`${date}T${time}:00`).toISOString();
      const appt = await createAppointment({
        invitee_id: peerId,
        type,
        scheduled_at,
        location_address: address || undefined,
        deposit_amount: deposit || 0,
        order_id: orderId,
        chat_thread_id: chatThreadId,
        notes: notes || undefined,
      });
      toast.success("Agendamento proposto!", {
        description: peerName ? `Aguardando confirmação de ${peerName}.` : undefined,
      });
      onCreated?.(appt.id);
      onClose();
    } catch (e: any) {
      toast.error("Falha ao criar agendamento", { description: e?.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full sm:max-w-lg bg-[#0A0A0B] border border-white/10 rounded-t-3xl sm:rounded-3xl flex flex-col max-h-[100dvh] sm:max-h-[90vh]"
        style={{ paddingTop: "env(safe-area-inset-top)", paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        {/* Header */}
        <div className="shrink-0 flex items-center justify-between p-4 border-b border-white/10">
          <div className="flex items-center gap-3 min-w-0">
            <CalendarIcon className="w-5 h-5 text-primary shrink-0" />
            <h2 className="text-base font-black uppercase truncate">Propor Agendamento</h2>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto scrollbar-none p-4 space-y-4">
          {/* Tipo */}
          <div>
            <label className="block text-[10px] font-black uppercase tracking-widest text-white/50 mb-2">
              Tipo de compromisso
            </label>
            <div className="grid grid-cols-1 gap-2">
              {(Object.keys(APPOINTMENT_TYPES) as AppointmentType[]).map((k) => {
                const t = APPOINTMENT_TYPES[k];
                const selected = type === k;
                return (
                  <button
                    key={k}
                    type="button"
                    onClick={() => setType(k)}
                    className="w-full flex items-center gap-3 p-3 rounded-xl border text-left transition-all"
                    style={{
                      borderColor: selected ? "hsl(var(--primary))" : "rgba(255,255,255,0.1)",
                      backgroundColor: selected ? "hsl(var(--primary) / 0.1)" : "rgba(255,255,255,0.03)",
                    }}
                  >
                    <span className="text-xl shrink-0">{t.icon}</span>
                    <span className="text-xs font-bold">{t.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Data e horário */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-black uppercase tracking-widest text-white/50 mb-2">
                Data
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                min={new Date().toISOString().slice(0, 10)}
                className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-3 text-sm text-white"
              />
            </div>
            <div>
              <label className="block text-[10px] font-black uppercase tracking-widest text-white/50 mb-2">
                Horário
              </label>
              <input
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-3 text-sm text-white"
              />
            </div>
          </div>

          {/* Local */}
          <div>
            <label className="block text-[10px] font-black uppercase tracking-widest text-white/50 mb-2">
              <MapPin className="w-3 h-3 inline mr-1" /> Local
            </label>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Endereço completo do compromisso"
              className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-3 text-sm text-white placeholder:text-white/30"
            />
          </div>

          {/* Sinal / Custódia */}
          <div>
            <label className="block text-[10px] font-black uppercase tracking-widest text-white/50 mb-2">
              <DollarSign className="w-3 h-3 inline mr-1" /> Sinal / Valor de reserva (opcional)
            </label>
            <CurrencyInputBRL
              value={deposit}
              onChange={setDeposit}
              placeholder="R$ 0,00"
            />
            <p className="text-[10px] text-white/40 mt-1.5">
              Se informado, o valor fica em custódia até o check-out.
            </p>
          </div>

          {/* Notas */}
          <div>
            <label className="block text-[10px] font-black uppercase tracking-widest text-white/50 mb-2">
              Observações (opcional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder:text-white/30 resize-none"
              placeholder="Detalhes, materiais necessários, referências..."
            />
          </div>
        </div>

        {/* Footer sticky */}
        <div className="shrink-0 p-4 border-t border-white/10 flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-3 rounded-xl bg-white/5 text-white text-xs font-black uppercase"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={loading}
            className="flex-[2] py-3 rounded-xl bg-primary text-black text-xs font-black uppercase flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "📅 Propor Agendamento"}
          </button>
        </div>
      </div>
    </div>
  );
}
