import { ACTIVITY_MATRIX } from "@/lib/activity-branches";

type Props = {
  /** ID da macro atualmente selecionada (ou null = todas). */
  value: string | null;
  onChange: (macroId: string | null) => void;
  /** Cor de destaque (hex). */
  accent?: string;
  className?: string;
};

/**
 * Chips horizontais roláveis para filtrar o feed por macro-ramo.
 * Fluido em mobile (snap-x + scroll suave), sem dependências externas.
 */
export function MacroBranchChips({ value, onChange, accent = "#00E5FF", className }: Props) {
  return (
    <div
      className={`flex items-center gap-2 overflow-x-auto scrollbar-none snap-x snap-mandatory scroll-smooth -mx-3 px-3 sm:mx-0 sm:px-0 ${className ?? ""}`}
      style={{ WebkitOverflowScrolling: "touch" }}
    >
      <button
        type="button"
        onClick={() => onChange(null)}
        className="shrink-0 snap-start px-3 py-1.5 rounded-full text-[11px] font-black uppercase whitespace-nowrap tracking-wide transition-colors"
        style={
          value === null
            ? { backgroundColor: accent, color: "#000", boxShadow: `0 0 10px ${accent}55` }
            : { backgroundColor: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.7)", border: "1px solid rgba(255,255,255,0.1)" }
        }
      >
        ✨ Todos
      </button>
      {ACTIVITY_MATRIX.map((m) => {
        const active = value === m.id;
        return (
          <button
            key={m.id}
            type="button"
            onClick={() => onChange(active ? null : m.id)}
            title={m.label}
            className="shrink-0 snap-start px-3 py-1.5 rounded-full text-[11px] font-bold uppercase whitespace-nowrap tracking-wide flex items-center gap-1.5 transition-colors"
            style={
              active
                ? { backgroundColor: accent, color: "#000", boxShadow: `0 0 10px ${accent}55` }
                : { backgroundColor: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.75)", border: "1px solid rgba(255,255,255,0.1)" }
            }
          >
            <span>{m.icon}</span>
            <span className="max-w-[10rem] truncate">{m.label.split(",")[0]}</span>
          </button>
        );
      })}
    </div>
  );
}

/** Lista de termos (labels de ramos + subcategorias) de uma macro. */
export function getMacroSearchTerms(macroId: string): string[] {
  const macro = ACTIVITY_MATRIX.find((m) => m.id === macroId);
  if (!macro) return [];
  const out: string[] = [];
  for (const b of macro.branches) {
    if (b.label.startsWith("📝")) continue;
    out.push(b.label.toLowerCase());
    if (b.subcategories) out.push(...b.subcategories.map((s) => s.toLowerCase()));
  }
  return out;
}

/** Verifica se um texto casa com qualquer termo de uma macro. */
export function matchesMacro(text: string, macroId: string | null): boolean {
  if (!macroId) return true;
  const terms = getMacroSearchTerms(macroId);
  const t = text.toLowerCase();
  return terms.some((term) => t.includes(term));
}
