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

/** Converte hex #RRGGBB em "r, g, b" para uso em rgba(). Tolera valores inválidos. */
function hexToRgb(hex: string | null | undefined) {
  const safe = typeof hex === "string" && hex.length > 0 ? hex : "#00E5FF";
  const h = safe.replace("#", "");
  const r = parseInt(h.slice(0, 2), 16) || 0;
  const g = parseInt(h.slice(2, 4), 16) || 0;
  const b = parseInt(h.slice(4, 6), 16) || 0;
  return `${r}, ${g}, ${b}`;
}

/**
 * Retorna estilos inline prontos para aplicar cor de categoria.
 * Uso: <div style={theme.borderStyle}>…</div>
 */
export function getCategoryTheme(cat: CategoryKey | string | null | undefined) {
  const key = (cat && (cat as string) in CATEGORY_COLORS ? (cat as CategoryKey) : "lojista");
  const hex = CATEGORY_COLORS[key] ?? "#00E5FF";
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

/** Tema neutro (cinza) para quando a categoria do peer é desconhecida. */
export const NEUTRAL_THEME = {
  hex: "#9CA3AF",
  rgb: "156, 163, 175",
  label: "Usuário",
  highlight: undefined as string | undefined,
  color: { color: "#9CA3AF" },
  bgSoft: { backgroundColor: "rgba(156, 163, 175, 0.10)" },
  bgSolid: { backgroundColor: "#9CA3AF", color: "#0A0A0B" },
  borderSoft: { borderColor: "rgba(156, 163, 175, 0.30)" },
  borderStrong: { borderColor: "#9CA3AF" },
  glow: { boxShadow: "0 0 22px rgba(156, 163, 175, 0.22)" },
  glowStrong: { boxShadow: "0 0 26px rgba(156, 163, 175, 0.45)" },
  fill: { fill: "#9CA3AF", color: "#9CA3AF" },
};

/**
 * Deriva a categoria a partir do role textual do PEER (destinatário).
 * Retorna null quando não há sinal confiável (nunca "chuta" prestador).
 * Reconhece lojista, prestador, fornecedor (fornec/parceiro/b2b), cliente e admin.
 */
export function resolvePeerCategory(role: string | null | undefined): CategoryKey | null {
  const r = String(role || "").toLowerCase().trim();
  if (!r) return null;
  if (r.includes("lojista") || r.includes("loja") || r.includes("store")) return "lojista";
  if (r.includes("prestador") || r.includes("provider") || r.includes("servi")) return "prestador";
  if (r.includes("fornec") || r.includes("parceiro") || r.includes("b2b") || r.includes("supplier")) return "fornecedor";
  if (r.includes("cliente") || r.includes("customer") || r.includes("casual") || r.includes("final")) return "cliente";
  if (r.includes("admin")) return "admin";
  return null;
}

/**
 * Retorna sempre um objeto de tema para o peer: usa a categoria oficial
 * quando resolvida, ou o tema neutro (cinza) como fallback seguro.
 */
export function getPeerTheme(role: string | null | undefined) {
  const cat = resolvePeerCategory(role);
  return cat ? getCategoryTheme(cat) : NEUTRAL_THEME;
}
