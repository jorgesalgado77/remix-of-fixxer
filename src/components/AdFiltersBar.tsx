// =============================================================================
// AdFiltersBar — barra reutilizável de filtros de anúncios (urgência / raio / tag)
// para os feeds de Lojista, Prestador, Fornecedor (parceiro) e Cliente.
//
// - Consome o esquema de cores por papel via `role` (ou `accent` explícito)
// - Estado controlado (parent detém a fonte da verdade — ideal para URL params)
// - Layout consistente com os demais painéis (dark, chips arredondados)
// =============================================================================

import { memo } from "react";
import type { UrgencyTag } from "@/components/AdMetaBadges";
import { URGENCY_META } from "@/components/AdMetaBadges";
import {
  AD_DISTANCE_KEYS,
  AD_URGENCY_KEYS,
  type AdDistanceKey,
  type AdUrgencyKey,
} from "@/lib/ad-filter-search";

export type AdFilterRole = "lojista" | "prestador" | "parceiro" | "cliente";

/** Cores fixas por papel — espelham as usadas nos demais componentes do feed. */
export const AD_FILTER_ROLE_ACCENT: Record<AdFilterRole, string> = {
  lojista: "#00E5FF", // ciano
  prestador: "#FF9F0A", // laranja
  parceiro: "#A855F7", // roxo
  cliente: "#00FF87", // verde
};

export type AdFiltersBarProps = {
  /** Papel do usuário — determina o accent automaticamente. */
  role?: AdFilterRole;
  /** Sobrescreve a cor de destaque (opcional). */
  accent?: string;
  urgency: AdUrgencyKey;
  distance: AdDistanceKey;
  tag: string;
  onUrgencyChange: (v: AdUrgencyKey) => void;
  onDistanceChange: (v: AdDistanceKey) => void;
  onTagChange: (v: string) => void;
  /** Placeholder amigável do campo tag (ex.: "#promob", "#montagem"). */
  tagPlaceholder?: string;
  className?: string;
};

function hexAlpha(hex: string, alpha: string): string {
  // Retorna o hex com sufixo alpha (aa/bb/cc) — usado para bordas/backgrounds.
  return `${hex}${alpha}`;
}

function AdFiltersBarImpl(props: AdFiltersBarProps) {
  const {
    role,
    accent: accentOverride,
    urgency,
    distance,
    tag,
    onUrgencyChange,
    onDistanceChange,
    onTagChange,
    tagPlaceholder = "#tag",
    className = "",
  } = props;

  const accent = accentOverride ?? (role ? AD_FILTER_ROLE_ACCENT[role] : "#00E5FF");
  const accentSoft = hexAlpha(accent, "66");
  const accentBg = `${accent}1F`; // ~12% de opacidade

  return (
    <div
      className={`rounded-2xl bg-[#1A1A1B] border border-white/10 p-3 space-y-2 ${className}`}
      role="group"
      aria-label="Filtros do feed"
    >
      {/* URGÊNCIA */}
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="text-[10px] font-black uppercase tracking-widest text-white/50 mr-1">
          Urgência:
        </span>
        {AD_URGENCY_KEYS.map((k) => {
          const active = urgency === k;
          const meta = k === "todos" ? null : URGENCY_META[k as UrgencyTag];
          const style =
            active && meta
              ? { color: meta.color, borderColor: `${meta.color}66`, backgroundColor: meta.bg }
              : active
                ? { color: accent, borderColor: accentSoft, backgroundColor: accentBg }
                : {
                    color: "rgba(255,255,255,0.6)",
                    borderColor: "rgba(255,255,255,0.1)",
                  };
          return (
            <button
              key={k}
              type="button"
              onClick={() => onUrgencyChange(k)}
              aria-pressed={active}
              className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border transition-colors"
              style={style}
            >
              {k === "todos" ? "Todas" : meta!.label}
            </button>
          );
        })}
      </div>

      {/* DISTÂNCIA */}
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="text-[10px] font-black uppercase tracking-widest text-white/50 mr-1">
          Distância:
        </span>
        {AD_DISTANCE_KEYS.map((k) => {
          const active = distance === k;
          return (
            <button
              key={k}
              type="button"
              onClick={() => onDistanceChange(k)}
              aria-pressed={active}
              className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border transition-colors"
              style={
                active
                  ? { color: accent, borderColor: accentSoft, backgroundColor: accentBg }
                  : { color: "rgba(255,255,255,0.6)", borderColor: "rgba(255,255,255,0.1)" }
              }
            >
              {k === "todos" ? "Qualquer" : `Até ${k} km`}
            </button>
          );
        })}
      </div>

      {/* TAG */}
      <div className="flex items-center gap-2">
        <span className="text-[10px] font-black uppercase tracking-widest text-white/50">Tag:</span>
        <input
          value={tag}
          onChange={(e) => onTagChange(e.target.value)}
          placeholder={tagPlaceholder}
          aria-label="Filtrar por tag"
          className="flex-1 min-w-0 h-8 px-2.5 rounded-lg bg-black/40 border border-white/10 text-[12px] text-white placeholder-white/30 focus:outline-none"
          style={{ borderColor: tag ? accentSoft : undefined }}
        />
        {tag && (
          <button
            type="button"
            onClick={() => onTagChange("")}
            className="text-[10px] text-white/50 hover:text-white uppercase font-bold"
          >
            limpar
          </button>
        )}
      </div>
    </div>
  );
}

export const AdFiltersBar = memo(AdFiltersBarImpl);
