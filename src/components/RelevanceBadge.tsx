import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import type { RelevanceResult } from "@/lib/branch-relevance";

/**
 * Chip visual + tooltip explicativo: mostra POR QUE um card apareceu como
 * recomendado (mesmo ramo, subcategoria próxima ou setor afim).
 *
 * Uso:
 *   <RelevanceBadge result={scoreRelevanceDetailed(branches, ctx)} />
 *
 * Quando o nível é "none", o componente NÃO renderiza nada — assim o mesmo
 * JSX serve para cards em qualquer feed.
 */
type Props = {
  result: RelevanceResult;
  /** Estilo compacto (apenas ícone) — bom pra thumbnails de carrossel. */
  compact?: boolean;
  className?: string;
};

const STYLE: Record<
  Exclude<RelevanceResult["level"], "none">,
  { label: string; short: string; bg: string; border: string; text: string; icon: string }
> = {
  exact: {
    label: "Mesmo ramo",
    short: "🎯",
    bg: "rgba(0,255,135,0.14)",
    border: "rgba(0,255,135,0.55)",
    text: "#00FF87",
    icon: "🎯",
  },
  subcategory: {
    label: "Subcategoria próxima",
    short: "🧩",
    bg: "rgba(0,229,255,0.12)",
    border: "rgba(0,229,255,0.5)",
    text: "#00E5FF",
    icon: "🧩",
  },
  macro: {
    label: "Setor afim",
    short: "🔗",
    bg: "rgba(96,165,250,0.14)",
    border: "rgba(96,165,250,0.5)",
    text: "#60A5FA",
    icon: "🔗",
  },
};

export function RelevanceBadge({ result, compact = false, className = "" }: Props) {
  if (result.level === "none") return null;
  const s = STYLE[result.level];
  const reason = result.reason ?? s.label;

  return (
    <TooltipProvider delayDuration={150}>
      <Tooltip>
        <TooltipTrigger asChild>
          <span
            className={`inline-flex items-center gap-1 rounded-full border font-black uppercase tracking-widest whitespace-nowrap ${
              compact ? "px-1.5 py-0.5 text-[9px]" : "px-2 py-0.5 text-[9px]"
            } ${className}`}
            style={{ background: s.bg, borderColor: s.border, color: s.text }}
            aria-label={reason}
          >
            <span aria-hidden="true">{s.icon}</span>
            {!compact && <span>{s.label}</span>}
          </span>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-[240px] text-xs">
          <div className="font-bold mb-0.5" style={{ color: s.text }}>{s.label}</div>
          <div className="text-white/80">{reason}</div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export default RelevanceBadge;
