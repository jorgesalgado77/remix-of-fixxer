/**
 * Modal com os detalhes de um agendamento: local, tipo/serviço, valor,
 * contato, notas e ações permitidas (reagendar / cancelar).
 *
 * Regras de ação:
 *  - Cancelar: enquanto não estiver "completed" ou "cancelled".
 *  - Reagendar: mesmas condições; usuário informa nova data/hora.
 */
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Link } from "@tanstack/react-router";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  APPOINTMENT_STATUS,
  APPOINTMENT_TYPES,
  cancelAppointment,
  proposeReschedule,
  type Appointment,
} from "@/lib/appointments";
import { supabaseExternal } from "@/lib/supabaseExternal";
import { Calendar, Clock, MapPin, Phone, User, DollarSign, ExternalLink } from "lucide-react";

type ContactInfo = { name?: string | null; phone?: string | null; id: string };

const FINAL_STATUSES: Appointment["status"][] = ["completed", "cancelled"];

function toLocalInputValue(iso: string): string {
  const d = new Date(iso);
  const off = d.getTimezoneOffset();
  const local = new Date(d.getTime() - off * 60_000);
  return local.toISOString().slice(0, 16);
}

export function AppointmentDetailsModal({
  appointment,
  open,
  onOpenChange,
  onChanged,
  initialReschedule = false,
}: {
  appointment: Appointment | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onChanged?: () => void;
  initialReschedule?: boolean;
}) {
  const [contact, setContact] = useState<ContactInfo | null>(null);
  const [rescheduling, setRescheduling] = useState(false);
  const [newDate, setNewDate] = useState<string>("");
  const [busy, setBusy] = useState<"cancel" | "reschedule" | null>(null);

  useEffect(() => {
    if (!appointment || !open) return;
    setNewDate(toLocalInputValue(appointment.scheduled_at));
    setRescheduling(initialReschedule);

    (async () => {
      const { data: userData } = await supabaseExternal.auth.getUser();
      const meId = userData.user?.id;
      const otherId =
        meId && appointment.proposer_id === meId
          ? appointment.invitee_id
          : appointment.proposer_id;
      if (!otherId) return;
      const { data } = await supabaseExternal
        .from("profiles")
        .select("id, display_name, name, phone, whatsapp")
        .eq("id", otherId)
        .maybeSingle();
      setContact({
        id: otherId,
        name: (data?.display_name || data?.name) ?? "Contato",
        phone: (data?.phone || data?.whatsapp) ?? null,
      });
    })();
  }, [appointment, open]);

  if (!appointment) return null;
  const t = APPOINTMENT_TYPES[appointment.type];
  const s = APPOINTMENT_STATUS[appointment.status];
  const isFinal = FINAL_STATUSES.includes(appointment.status);
  const when = new Date(appointment.scheduled_at);

  async function handleCancel() {
    if (!appointment) return;
    if (!window.confirm("Cancelar este compromisso? Essa ação não pode ser desfeita.")) return;
    setBusy("cancel");
    try {
      const reason = window.prompt("Motivo do cancelamento (opcional):") ?? undefined;
      const res = await cancelAppointment(appointment.id, reason || undefined);
      if (res.cancelled) {
        toast.success(res.refunded ? "Cancelado e sinal reembolsado." : "Compromisso cancelado.");
        onChanged?.();
        onOpenChange(false);
      } else {
        toast.error(res.error ?? "Não foi possível cancelar.");
      }
    } catch (err: any) {
      toast.error(err?.message ?? "Erro ao cancelar.");
    } finally {
      setBusy(null);
    }
  }

  async function handleReschedule() {
    if (!appointment || !newDate) return;
    setBusy("reschedule");
    try {
      const iso = new Date(newDate).toISOString();
      await proposeReschedule(appointment.id, iso);
      toast.success("Novo horário proposto.");
      onChanged?.();
      setRescheduling(false);
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err?.message ?? "Erro ao reagendar.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-[#0F0F10] border-white/10 text-white max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-white">
            <span className="text-2xl">{t?.icon ?? "📅"}</span>
            <span className="uppercase tracking-tight font-black">{t?.label ?? "Compromisso"}</span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3 text-sm">
          <div
            className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-[10px] font-black uppercase tracking-widest border"
            style={{ color: s?.color, borderColor: `${s?.color}66`, background: `${s?.color}18` }}
          >
            {s?.icon} {s?.label}
          </div>

          <div className="grid grid-cols-1 gap-2 text-white/90">
            <Row icon={<Calendar className="w-4 h-4" />} label="Data">
              {when.toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit", month: "long", year: "numeric" })}
            </Row>
            <Row icon={<Clock className="w-4 h-4" />} label="Horário">
              {when.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })} — {appointment.duration_min}min
            </Row>
            {appointment.location_address && (
              <Row icon={<MapPin className="w-4 h-4" />} label="Local">
                {appointment.location_address}
              </Row>
            )}
            {appointment.deposit_amount > 0 && (
              <Row icon={<DollarSign className="w-4 h-4" />} label="Sinal / Valor">
                R$ {Number(appointment.deposit_amount).toFixed(2)}
              </Row>
            )}
            {contact && (
              <Row icon={<User className="w-4 h-4" />} label="Contato">
                <div className="flex items-center gap-2 flex-wrap">
                  <span>{contact.name}</span>
                  {contact.phone && (
                    <a
                      href={`tel:${contact.phone.replace(/\D/g, "")}`}
                      className="inline-flex items-center gap-1 text-[#00FF87] hover:underline text-xs"
                    >
                      <Phone className="w-3 h-3" /> {contact.phone}
                    </a>
                  )}
                </div>
              </Row>
            )}
            {appointment.notes && (
              <div className="rounded-lg border border-white/10 bg-white/5 p-3 text-xs whitespace-pre-line">
                {appointment.notes}
              </div>
            )}
          </div>

          {rescheduling && !isFinal && (
            <div className="rounded-lg border border-[#00E5FF]/40 bg-[#00E5FF]/5 p-3 space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-[#00E5FF]">
                Novo horário
              </label>
              <Input
                type="datetime-local"
                value={newDate}
                onChange={(e) => setNewDate(e.target.value)}
                className="bg-black/40 border-white/10 text-white"
              />
            </div>
          )}
        </div>

        <DialogFooter className="flex flex-wrap gap-2 justify-between items-center">
          <Link
            to="/agenda/$id"
            params={{ id: appointment.id }}
            onClick={() => onOpenChange(false)}
            className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-white/70 hover:text-white"
          >
            Abrir página completa <ExternalLink className="w-3 h-3" />
          </Link>
          <div className="flex flex-wrap gap-2">
            {!isFinal && !rescheduling && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setRescheduling(true)}
                  className="border-[#00E5FF]/40 text-[#00E5FF] hover:bg-[#00E5FF]/10"
                >
                  Reagendar
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  disabled={busy === "cancel"}
                  onClick={handleCancel}
                >
                  {busy === "cancel" ? "Cancelando…" : "Cancelar"}
                </Button>
              </>
            )}
            {rescheduling && !isFinal && (
              <>
                <Button variant="ghost" size="sm" onClick={() => setRescheduling(false)}>
                  Voltar
                </Button>
                <Button
                  size="sm"
                  disabled={busy === "reschedule" || !newDate}
                  onClick={handleReschedule}
                  className="bg-[#00E5FF] text-black hover:bg-[#00E5FF]/90"
                >
                  {busy === "reschedule" ? "Enviando…" : "Confirmar novo horário"}
                </Button>
              </>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Row({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2">
      <span className="text-[#00FF87] mt-0.5">{icon}</span>
      <div className="flex-1 min-w-0">
        <div className="text-[10px] font-black uppercase tracking-widest text-white/50">{label}</div>
        <div className="text-sm text-white/90 break-words">{children}</div>
      </div>
    </div>
  );
}

export default AppointmentDetailsModal;
