/**
 * Paleta oficial FIXXER por categoria.
 * Fonte única de verdade — não hardcodar cores diretamente nos componentes.
 */

export type CategoryKey = "lojista" | "prestador" | "fornecedor" | "cliente" | "admin";

export const CATEGORY_COLORS: Record<CategoryKey, string> = {
  lojista: "#00E5FF",     // Azul Ciano Elétrico
  prestador: "#FF9F0A",   // Laranja Âmbar Neon
  fornecedor: "#A855F7",  // Roxo / Violeta Elétrico
  cliente: "#00FF87",     // Verde Esmeralda Neon
  admin: "#FFD600",       // Dourado / Amarelo Neon
};

export const CATEGORY_LABEL: Record<CategoryKey, string> = {
  lojista: "Lojista",
  prestador: "Prestador",
  fornecedor: "Fornecedor B2B",
  cliente: "Cliente Final",
  admin: "Admin Master",
};

export const CATEGORY_HIGHLIGHT: Partial<Record<CategoryKey, string>> = {
  cliente: "🔥 Oportunidade - Cliente Final",
};

/** Converte hex #RRGGBB em "r, g, b" para uso em rgba(). */
function hexToRgb(hex: string) {
  const h = hex.replace("#", "");
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `${r}, ${g}, ${b}`;
}

/**
 * Retorna estilos inline prontos para aplicar cor de categoria.
 * Uso: <div style={theme.borderStyle}>…</div>
 */
export function getCategoryTheme(cat: CategoryKey) {
  const hex = CATEGORY_COLORS[cat];
  const rgb = hexToRgb(hex);
  return {
    hex,
    rgb,
    label: CATEGORY_LABEL[cat],
    highlight: CATEGORY_HIGHLIGHT[cat],
    // estilos inline
    color: { color: hex },
    bgSoft: { backgroundColor: `rgba(${rgb}, 0.10)` },
    bgSolid: { backgroundColor: hex, color: "#0A0A0B" },
    borderSoft: { borderColor: `rgba(${rgb}, 0.30)` },
    borderStrong: { borderColor: hex },
    glow: { boxShadow: `0 0 22px rgba(${rgb}, 0.22)` },
    glowStrong: { boxShadow: `0 0 26px rgba(${rgb}, 0.45)` },
    fill: { fill: hex, color: hex },
  };
}
