import { Search, SlidersHorizontal, Sparkles, RotateCcw } from "lucide-react";

export type FeedEmptyStateProps = {
  accent?: string;
  title?: string;
  searchTerm?: string;
  filterLabel?: string;
  hasActiveFilters?: boolean;
  onReset?: () => void;
  suggestions?: string[];
  onSuggestion?: (term: string) => void;
};

function hexToRgba(hex: string, alpha: number) {
  const h = hex.replace("#", "");
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export function FeedEmptyState({
  accent = "#00FF87",
  title = "Nenhum resultado encontrado",
  searchTerm,
  filterLabel,
  hasActiveFilters,
  onReset,
  suggestions,
  onSuggestion,
}: FeedEmptyStateProps) {
  const showReset = hasActiveFilters || onReset;

  return (
    <div
      className="rounded-3xl border bg-[#1A1A1B] p-6 sm:p-10 text-center"
      style={{ borderColor: hexToRgba(accent, 0.25) }}
      aria-live="polite"
    >
      <div
        className="w-16 h-16 sm:w-20 sm:h-20 mx-auto mb-4 rounded-2xl border flex items-center justify-center"
        style={{
          borderColor: hexToRgba(accent, 0.3),
          backgroundColor: hexToRgba(accent, 0.08),
          boxShadow: `0 0 24px ${hexToRgba(accent, 0.15)}`,
        }}
      >
        <Search className="w-7 h-7 sm:w-8 sm:h-8" style={{ color: accent }} />
      </div>

      <h3
        className="font-black uppercase italic text-base sm:text-lg text-white mb-2 tracking-tight"
        style={{ textShadow: `0 0 16px ${hexToRgba(accent, 0.3)}` }}
      >
        {title}
      </h3>

      <p className="text-xs text-white/50 max-w-sm mx-auto leading-relaxed mb-5">
        {searchTerm ? (
          <>
            Nenhum resultado para <span className="text-white font-semibold">"{searchTerm}"</span>
            {filterLabel ? ` em ${filterLabel.toLowerCase()}.` : "."}
            <br />
            Tente ajustar os filtros ou usar um dos termos sugeridos.
          </>
        ) : (
          <>
            Tente ajustar os filtros de busca, categoria ou raio de atuação para encontrar novas
            oportunidades.
          </>
        )}
      </p>

      {showReset && (
        <button
          onClick={onReset}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border text-[11px] font-black uppercase tracking-widest text-white transition-all hover:scale-[1.02] active:scale-95"
          style={{
            borderColor: hexToRgba(accent, 0.35),
            backgroundColor: hexToRgba(accent, 0.08),
            boxShadow: `0 0 14px ${hexToRgba(accent, 0.12)}`,
          }}
        >
          <RotateCcw className="w-3.5 h-3.5" />
          Limpar Filtros
        </button>
      )}

      {suggestions && suggestions.length > 0 && (
        <div className="mt-6 pt-6 border-t border-white/10">
          <div className="flex items-center justify-center gap-2 mb-3 text-[10px] font-black uppercase tracking-widest text-white/40">
            <Sparkles className="w-3 h-3" />
            Sugestões de busca
          </div>
          <div className="flex flex-wrap justify-center gap-2">
            {suggestions.map((term) => (
              <button
                key={term}
                onClick={() => onSuggestion?.(term)}
                className="px-3 py-1.5 rounded-full border text-[10px] font-bold transition-colors hover:text-white"
                style={{
                  borderColor: hexToRgba(accent, 0.25),
                  color: hexToRgba(accent, 0.9),
                  backgroundColor: hexToRgba(accent, 0.05),
                }}
              >
                {term}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="mt-5 flex items-center justify-center gap-1.5 text-[10px] text-white/30">
        <SlidersHorizontal className="w-3 h-3" />
        Dica: use o botão Filtros no topo para refinar a busca.
      </div>
    </div>
  );
}
