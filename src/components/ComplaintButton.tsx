import { useState } from "react";
import { AlertOctagon, Loader2, ShieldAlert } from "lucide-react";
import { toast } from "sonner";
import { openDispute, uploadDisputeEvidences, type DisputeAction } from "@/lib/appointment-disputes";
import { supabaseExternal } from "@/lib/supabaseExternal";

interface Props {
  appointmentId: string;
  /** Chamado quando a reclamação for aberta com sucesso (recarregar a página, etc). */
  onOpened?: () => void;
  className?: string;
}

const OPTIONS: { value: DisputeAction; label: string; hint: string }[] = [
  { value: "refund_review",  label: "🛠 Refazer serviço / Ajuste",        hint: "Solicito o retrabalho ou ajuste técnico." },
  { value: "partial_refund", label: "💸 Reembolso parcial",                hint: "Aceito um acordo com reembolso proporcional." },
  { value: "full_refund",    label: "↩️ Cancelamento e devolução total",   hint: "Peço o cancelamento e a devolução total ao contratante." },
];

/**
 * Botão global "🔴 ABRIR RECLAMAÇÃO" para a O.S. em andamento.
 *
 * Efeitos ao abrir:
 *  1. Cria um registro em `appointment_disputes` (status=open).
 *  2. Atualiza o `appointments.status = 'in_dispute'` (congela a custódia — o
 *     valor deixa de ser liberável até que a mediação/admin resolva).
 *  3. Notifica a contraparte (o próprio `openDispute` já publica notification+push).
 *
 * A mediação inicial de 3 dias úteis acontece no Chat (banner contextual);
 * após o prazo, o botão "🛡️ Solicitar Mediação FIXXER" aparece na tela de
 * detalhes do compromisso e envia para o painel `/admin/disputas`.
 */
export function ComplaintButton({ appointmentId, onOpened, className }: Props) {
  const [open, setOpen] = useState(false);
  const [action, setAction] = useState<DisputeAction>("refund_review");
  const [reason, setReason] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (reason.trim().length < 10) {
      toast.error("Descreva o motivo com pelo menos 10 caracteres.");
      return;
    }
    try {
      setSaving(true);
      let evidence_urls: string[] = [];
      if (files.length) {
        toast("Enviando evidências...");
        evidence_urls = await uploadDisputeEvidences(appointmentId, files);
      }
      await openDispute({
        appointment_id: appointmentId,
        requested_action: action,
        reason: reason.trim(),
        evidence_urls,
      });

      // Congela a custódia — marca o compromisso como em disputa.
      try {
        await supabaseExternal
          .from("appointments")
          .update({ status: "in_dispute", escrow_frozen_at: new Date().toISOString() })
          .eq("id", appointmentId);
      } catch (e) {
        console.warn("[complaint] falha ao congelar escrow (não bloqueante)", e);
      }

      toast.success("Reclamação aberta — custódia congelada.", {
        description: "A contraparte foi notificada. Prazo de mediação: 3 dias úteis.",
      });
      setOpen(false);
      setReason(""); setFiles([]);
      onOpened?.();
    } catch (e: any) {
      toast.error("Falha ao abrir reclamação", { description: e?.message });
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={
          "inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-[#FF3B30]/15 border border-[#FF3B30]/40 " +
          "text-[#FF3B30] text-[11px] font-black uppercase tracking-widest hover:bg-[#FF3B30]/25 transition " +
          (className || "")
        }
      >
        <AlertOctagon className="w-4 h-4" />
        🔴 Abrir Reclamação
      </button>

      {open && (
        <div
          className="fixed inset-0 z-[140] bg-black/85 backdrop-blur-md flex items-end sm:items-center justify-center"
          onClick={() => !saving && setOpen(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full sm:max-w-md bg-[#0A0A0B] border border-white/10 rounded-t-3xl sm:rounded-3xl p-4 space-y-4"
            style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 16px)", maxHeight: "92dvh", overflowY: "auto" }}
          >
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-[#FF3B30]" />
              <h3 className="text-sm font-black uppercase tracking-tight">Abrir reclamação</h3>
            </div>
            <div className="rounded-lg bg-[#FF3B30]/10 border border-[#FF3B30]/25 p-2.5">
              <p className="text-[10px] text-[#FF3B30] font-bold uppercase">⚠️ Custódia será congelada</p>
              <p className="text-[10px] text-white/70 mt-1">
                O valor retido em custódia (escrow) será bloqueado imediatamente e só será liberado
                após acordo no chat ou parecer da Mediação FIXXER.
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-white/60">Tipo de acordo desejado</label>
              <div className="grid gap-1.5">
                {OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setAction(opt.value)}
                    className={`text-left p-2.5 rounded-lg border transition ${
                      action === opt.value
                        ? "bg-[#FF3B30]/15 border-[#FF3B30] text-white"
                        : "bg-white/5 border-white/10 text-white/70"
                    }`}
                  >
                    <p className="text-[11px] font-black uppercase">{opt.label}</p>
                    <p className="text-[10px] text-white/50 mt-0.5">{opt.hint}</p>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-[10px] font-black uppercase text-white/60">Motivo detalhado</label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={4}
                maxLength={1000}
                placeholder="Descreva o que ocorreu, itens envolvidos, valores, prazos e o que espera como solução."
                className="w-full mt-1 bg-[#1A1A1B] border border-white/10 rounded-lg px-3 py-2 text-sm text-white resize-none"
              />
              <p className="text-[9px] text-white/40 mt-1">{reason.length}/1000</p>
            </div>

            <div>
              <label className="text-[10px] font-black uppercase text-white/60">Fotos / laudos (opcional)</label>
              <input
                type="file"
                multiple
                accept="image/*,application/pdf"
                onChange={(e) => setFiles(Array.from(e.target.files ?? []).slice(0, 6))}
                className="w-full mt-1 text-[11px] text-white/70"
              />
              {files.length > 0 && (
                <p className="text-[10px] text-white/60 mt-1">{files.length} arquivo(s) selecionado(s)</p>
              )}
            </div>

            <div className="flex gap-2 pt-1">
              <button
                onClick={() => setOpen(false)}
                disabled={saving}
                className="flex-1 py-2.5 rounded-lg bg-white/5 border border-white/10 text-[10px] font-black uppercase tracking-widest text-white/70"
              >
                Cancelar
              </button>
              <button
                onClick={submit}
                disabled={saving}
                className="flex-1 py-2.5 rounded-lg bg-[#FF3B30] text-white text-[10px] font-black uppercase tracking-widest disabled:opacity-40 flex items-center justify-center gap-2"
              >
                {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <AlertOctagon className="w-3 h-3" />}
                Congelar custódia e abrir
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
