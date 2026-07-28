// =============================================================================
// Diálogo autônomo para denunciar um usuário. Reutilizável em cards e chat.
// Controle: props `open`/`onClose`. Toast + persistência via lib/moderation.
// =============================================================================

import { useState } from "react";
import { AlertTriangle, Flag, X } from "lucide-react";
import { toast } from "sonner";
import { REPORT_REASONS, reportUser, type ReportReason } from "@/lib/moderation";

export type ReportUserDialogProps = {
  open: boolean;
  onClose: () => void;
  targetUserId: string;
  targetName?: string | null;
  actorUserId: string | null;
  context?: string;
  accent?: string;
};

export function ReportUserDialog({
  open,
  onClose,
  targetUserId,
  targetName,
  actorUserId,
  context,
  accent = "#FFB020",
}: ReportUserDialogProps) {
  const [reason, setReason] = useState<ReportReason>("spam");
  const [details, setDetails] = useState("");
  const [busy, setBusy] = useState(false);

  if (!open) return null;

  const submit = async () => {
    setBusy(true);
    try {
      const res = await reportUser({
        reporterId: actorUserId,
        targetUserId,
        reason,
        details: details.trim() || undefined,
        context,
      });
      toast.success(
        res.synced
          ? "Denúncia enviada. Nossa equipe vai avaliar."
          : "Denúncia registrada. Vamos sincronizar assim que possível.",
        { duration: 5500 },
      );
      setDetails("");
      setReason("spam");
      onClose();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[160] bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-3"
      role="dialog"
      aria-modal="true"
      onClick={() => !busy && onClose()}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md bg-[#0A0A0B] border border-white/10 rounded-3xl p-5 space-y-4"
      >
        <div className="flex items-start gap-3">
          <div
            className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0 border"
            style={{ background: `${accent}15`, borderColor: `${accent}55` }}
          >
            <AlertTriangle className="w-5 h-5" style={{ color: accent }} />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-sm font-black uppercase text-white">
              Denunciar {targetName ? `“${targetName}”` : "usuário"}
            </h3>
            <p className="text-[11px] text-white/60 mt-1 leading-relaxed">
              Sua denúncia é anônima para o denunciado. Se houver risco imediato, também bloqueie o usuário.
            </p>
          </div>
          <button
            type="button"
            onClick={() => !busy && onClose()}
            aria-label="Fechar"
            className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 text-white/70 hover:text-white inline-flex items-center justify-center"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-1.5">
          <label className="text-[10px] font-black uppercase tracking-widest text-white/50">Motivo</label>
          <div className="grid grid-cols-1 gap-1.5 max-h-[38vh] overflow-auto pr-1">
            {REPORT_REASONS.map((r) => {
              const active = reason === r.key;
              return (
                <button
                  key={r.key}
                  type="button"
                  onClick={() => setReason(r.key)}
                  className="w-full px-3 py-2 rounded-xl border text-left text-[12px] transition-colors"
                  style={
                    active
                      ? { color: accent, borderColor: `${accent}88`, background: `${accent}12` }
                      : { color: "rgba(255,255,255,0.8)", borderColor: "rgba(255,255,255,0.1)" }
                  }
                >
                  {r.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-[10px] font-black uppercase tracking-widest text-white/50">
            Detalhes (opcional)
          </label>
          <textarea
            value={details}
            onChange={(e) => setDetails(e.target.value.slice(0, 500))}
            rows={3}
            placeholder="Conte o que aconteceu. Não inclua dados pessoais sensíveis."
            className="w-full rounded-xl bg-black/40 border border-white/10 p-2.5 text-[12px] text-white placeholder-white/30 focus:outline-none focus:border-white/30 resize-none"
          />
          <div className="text-right text-[10px] text-white/40">{details.length}/500</div>
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={onClose}
            className="flex-1 h-10 rounded-xl bg-white/5 border border-white/10 text-white/80 text-[11px] font-bold uppercase disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={submit}
            className="flex-1 h-10 rounded-xl text-black text-[11px] font-black uppercase inline-flex items-center justify-center gap-1.5 disabled:opacity-60"
            style={{ background: accent }}
          >
            <Flag className="w-3.5 h-3.5" /> {busy ? "Enviando..." : "Enviar denúncia"}
          </button>
        </div>
      </div>
    </div>
  );
}
