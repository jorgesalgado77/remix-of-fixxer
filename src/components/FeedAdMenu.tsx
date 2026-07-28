// =============================================================================
// FeedAdMenu — menu ⋮ universal para cards de anúncio nos feeds.
// - Modo DONO: Editar / Pausar / Excluir
// - Modo VISITANTE: Denunciar / Bloquear (via ReportBlockMenu)
// - Mobile-first, click-out para fechar, portable (posiciona-se no canto do card).
// =============================================================================

import { memo, useEffect, useRef, useState } from "react";
import { Edit3, Flag, MoreVertical, Pause, Play, Trash2 } from "lucide-react";
import { ReportBlockMenu } from "@/components/ReportBlockMenu";

export type FeedAdMenuProps = {
  /** ID do dono do anúncio (para comparação com currentUserId) */
  ownerId: string | null | undefined;
  /** ID do usuário logado (para decidir dono vs visitante) */
  currentUserId: string | null | undefined;
  /** ID do anúncio (usado em context de denúncia) */
  adId: string;
  /** Nome do dono (usado no dialog de denúncia) */
  ownerName?: string | null;
  /** Se o anúncio está pausado (para inverter o label do botão) */
  isPaused?: boolean;
  /** Callbacks — só disparam no modo dono */
  onEdit?: () => void;
  onTogglePause?: () => void;
  onDelete?: () => void;
  /** Cor de destaque (borda/acento). Default: âmbar */
  accent?: string;
  className?: string;
};

function FeedAdMenuImpl({
  ownerId,
  currentUserId,
  adId,
  ownerName,
  isPaused,
  onEdit,
  onTogglePause,
  onDelete,
  accent = "#FFB020",
  className,
}: FeedAdMenuProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const isOwner = !!ownerId && !!currentUserId && ownerId === currentUserId;

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  // Visitante → delega direto ao ReportBlockMenu (já implementa denunciar + bloquear).
  if (!isOwner) {
    if (!ownerId) return null;
    return (
      <ReportBlockMenu
        targetUserId={ownerId}
        targetName={ownerName ?? undefined}
        actorUserId={currentUserId ?? null}
        context={`ad:${adId}`}
        accent={accent}
        className={className}
      />
    );
  }

  // Dono → menu próprio.
  return (
    <div ref={ref} className={`relative ${className ?? ""}`}>
      <button
        type="button"
        aria-label="Mais opções"
        onClick={() => setOpen((v) => !v)}
        className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 text-white/70 hover:text-white hover:bg-white/10 inline-flex items-center justify-center"
      >
        <MoreVertical className="w-4 h-4" />
      </button>
      {open && (
        <div
          onClick={(e) => e.stopPropagation()}
          className="absolute right-0 top-9 z-30 min-w-[200px] rounded-xl border border-white/10 bg-[#111112] shadow-2xl py-1.5"
        >
          {onEdit && (
            <button
              type="button"
              onClick={() => { setOpen(false); onEdit(); }}
              className="w-full px-3 py-2 text-left text-[12px] font-bold text-white/90 hover:bg-white/5 inline-flex items-center gap-2"
            >
              <Edit3 className="w-3.5 h-3.5" /> Editar
            </button>
          )}
          {onTogglePause && (
            <button
              type="button"
              onClick={() => { setOpen(false); onTogglePause(); }}
              className="w-full px-3 py-2 text-left text-[12px] font-bold text-white/90 hover:bg-white/5 inline-flex items-center gap-2"
              style={{ color: accent }}
            >
              {isPaused ? (
                <><Play className="w-3.5 h-3.5" /> Retomar</>
              ) : (
                <><Pause className="w-3.5 h-3.5" /> Pausar</>
              )}
            </button>
          )}
          {onDelete && (
            <button
              type="button"
              onClick={() => { setOpen(false); onDelete(); }}
              className="w-full px-3 py-2 text-left text-[12px] font-bold text-[#FF3B6B] hover:bg-[#FF3B6B]/10 inline-flex items-center gap-2 border-t border-white/5"
            >
              <Trash2 className="w-3.5 h-3.5" /> Excluir
            </button>
          )}
          {/* atalho de denúncia mesmo sendo dono — invisível por design */}
          <div className="hidden">
            <Flag className="w-3 h-3" />
          </div>
        </div>
      )}
    </div>
  );
}

const FeedAdMenu = memo(FeedAdMenuImpl);
export default FeedAdMenu;
