// =============================================================================
// Menu compacto de moderação usado em cards de feed e no chat.
// - Botão de trigger customizável (ícone/label opcional).
// - Abre popover com "Denunciar" e "Bloquear/Desbloquear".
// - Ao denunciar, apresenta lista de motivos + campo opcional de detalhes.
// - Feedback via toast; comprovante gravado no localStorage.
// =============================================================================

import { memo, useEffect, useRef, useState } from "react";
import { AlertTriangle, Ban, Flag, MoreVertical, ShieldCheck, X } from "lucide-react";
import { toast } from "sonner";
import {
  blockUser,
  isUserBlocked,
  REPORT_REASONS,
  reportUser,
  subscribeBlockedUsers,
  unblockUser,
  type ReportReason,
} from "@/lib/moderation";

export type ReportBlockMenuProps = {
  targetUserId: string;
  targetName?: string | null;
  actorUserId: string | null;
  /** contexto textual salvo junto da denúncia (ex.: "card:post_123", "chat:peer_abc") */
  context?: string;
  /** Se true, renderiza apenas o item "Denunciar" (sem bloquear). Útil onde o bloqueio já existe. */
  reportOnly?: boolean;
  /** Se true, renderiza apenas o item "Bloquear/Desbloquear". */
  blockOnly?: boolean;
  className?: string;
  /** cor de acento (bordas/hover). Default: âmbar de alerta. */
  accent?: string;
  /** ícone/label customizados no trigger. */
  triggerAriaLabel?: string;
  triggerIcon?: React.ReactNode;
  /** callback ao concluir uma ação de moderação (para o consumidor refiltrar UI, se quiser) */
  onChanged?: () => void;
};

function ReportBlockMenuImpl({
  targetUserId,
  targetName,
  actorUserId,
  context,
  reportOnly,
  blockOnly,
  className,
  accent = "#FFB020",
  triggerAriaLabel = "Opções de moderação",
  triggerIcon,
  onChanged,
}: ReportBlockMenuProps) {
  const [open, setOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [reason, setReason] = useState<ReportReason>("spam");
  const [details, setDetails] = useState("");
  const [busy, setBusy] = useState(false);
  const [blocked, setBlocked] = useState<boolean>(() => isUserBlocked(targetUserId));
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setBlocked(isUserBlocked(targetUserId));
    return subscribeBlockedUsers(() => setBlocked(isUserBlocked(targetUserId)));
  }, [targetUserId]);

  useEffect(() => {
    if (!open) return;
    const off = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener("mousedown", off);
    return () => window.removeEventListener("mousedown", off);
  }, [open]);

  const isSelf = !!actorUserId && actorUserId === targetUserId;
  if (isSelf) return null; // ninguém denuncia/bloqueia a si mesmo

  const handleBlock = async () => {
    setBusy(true);
    try {
      if (blocked) {
        await unblockUser(actorUserId, targetUserId);
        toast.success(`${targetName ?? "Usuário"} desbloqueado.`);
      } else {
        await blockUser(actorUserId, targetUserId);
        toast.success(`${targetName ?? "Usuário"} bloqueado. Você não verá mais conteúdo dessa pessoa.`, {
          duration: 5000,
        });
      }
      setOpen(false);
      onChanged?.();
    } finally {
      setBusy(false);
    }
  };

  const submitReport = async () => {
    setBusy(true);
    try {
      const res = await reportUser({
        reporterId: actorUserId,
        targetUserId,
        reason,
        details: details.trim() || undefined,
        context,
      });
      if (res.ok) {
        toast.success(
          res.synced
            ? "Denúncia enviada. Nossa equipe vai avaliar."
            : "Denúncia registrada (offline). Vamos sincronizar assim que possível.",
          { duration: 5500 },
        );
      }
      setReportOpen(false);
      setOpen(false);
      setDetails("");
      setReason("spam");
      onChanged?.();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={`relative ${className ?? ""}`} ref={ref}>
      <button
        type="button"
        aria-label={triggerAriaLabel}
        onClick={(e) => {
          e.stopPropagation();
          e.preventDefault();
          setOpen((v) => !v);
        }}
        className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 text-white/70 hover:text-white hover:bg-white/10 inline-flex items-center justify-center transition-colors"
        style={{ borderColor: open ? `${accent}66` : undefined }}
      >
        {triggerIcon ?? <MoreVertical className="w-4 h-4" />}
      </button>

      {open && (
        <div
          onClick={(e) => e.stopPropagation()}
          className="absolute right-0 top-9 z-40 min-w-[210px] rounded-xl border border-white/10 bg-[#111112] shadow-2xl py-1.5"
        >
          {!blockOnly && (
            <button
              type="button"
              onClick={() => {
                setReportOpen(true);
                setOpen(false);
              }}
              className="w-full px-3 py-2 text-left text-[12px] font-bold text-white/90 hover:bg-white/5 inline-flex items-center gap-2"
            >
              <Flag className="w-3.5 h-3.5" style={{ color: accent }} />
              Denunciar
            </button>
          )}
          {!reportOnly && (
            <button
              type="button"
              disabled={busy}
              onClick={handleBlock}
              className="w-full px-3 py-2 text-left text-[12px] font-bold hover:bg-white/5 inline-flex items-center gap-2 disabled:opacity-50"
              style={{ color: blocked ? "#39FF88" : "#FF3B6B" }}
            >
              {blocked ? <ShieldCheck className="w-3.5 h-3.5" /> : <Ban className="w-3.5 h-3.5" />}
              {blocked ? "Desbloquear usuário" : "Bloquear usuário"}
            </button>
          )}
        </div>
      )}

      {reportOpen && (
        <div
          className="fixed inset-0 z-[160] bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-3"
          role="dialog"
          aria-modal="true"
          onClick={() => !busy && setReportOpen(false)}
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
                <h3 className="text-sm font-black uppercase text-white">Denunciar {targetName ? `“${targetName}”` : "usuário"}</h3>
                <p className="text-[11px] text-white/60 mt-1 leading-relaxed">
                  Sua denúncia é anônima para o denunciado. Se houver risco imediato, também bloqueie o usuário.
                </p>
              </div>
              <button
                type="button"
                onClick={() => !busy && setReportOpen(false)}
                aria-label="Fechar"
                className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 text-white/70 hover:text-white inline-flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-widest text-white/50">Motivo</label>
              <div className="grid grid-cols-1 gap-1.5">
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
                onClick={() => setReportOpen(false)}
                className="flex-1 h-10 rounded-xl bg-white/5 border border-white/10 text-white/80 text-[11px] font-bold uppercase disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={submitReport}
                className="flex-1 h-10 rounded-xl text-black text-[11px] font-black uppercase inline-flex items-center justify-center gap-1.5 disabled:opacity-60"
                style={{ background: accent }}
              >
                <Flag className="w-3.5 h-3.5" /> {busy ? "Enviando..." : "Enviar denúncia"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export const ReportBlockMenu = memo(ReportBlockMenuImpl);
