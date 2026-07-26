/**
 * Helper de classes Tailwind por categoria — API leve para uso direto em
 * className (sem re-render pesado, sem style inline). Complementa
 * getCategoryTheme (inline styles) e resolvePeerCategory (normalização).
 *
 * Uso:
 *   const c = getCategoryColor(role);
 *   <div className={`border ${c.border} ${c.bgGlow}`} />
 *
 * Cores oficiais FIXXER:
 *   Lojista    → #00E5FF  (Ciano)
 *   Prestador  → #FF9F0A  (Âmbar)
 *   Fornecedor → #A855F7  (Roxo)
 *   Cliente    → #00FF87  (Verde)
 */

export type CategoryColor = {
  hex: string;
  border: string;
  text: string;
  bg: string;
  bgGlow: string;
  badgeBg: string;
};

const LOJISTA: CategoryColor = {
  hex: "#00E5FF",
  border: "border-[#00E5FF]",
  text: "text-[#00E5FF]",
  bg: "bg-[#00E5FF]",
  bgGlow: "shadow-[0_0_15px_rgba(0,229,255,0.3)]",
  badgeBg: "bg-[#00E5FF]/10 text-[#00E5FF] border-[#00E5FF]/30",
};
const PRESTADOR: CategoryColor = {
  hex: "#FF9F0A",
  border: "border-[#FF9F0A]",
  text: "text-[#FF9F0A]",
  bg: "bg-[#FF9F0A]",
  bgGlow: "shadow-[0_0_15px_rgba(255,159,10,0.3)]",
  badgeBg: "bg-[#FF9F0A]/10 text-[#FF9F0A] border-[#FF9F0A]/30",
};
const FORNECEDOR: CategoryColor = {
  hex: "#A855F7",
  border: "border-[#A855F7]",
  text: "text-[#A855F7]",
  bg: "bg-[#A855F7]",
  bgGlow: "shadow-[0_0_15px_rgba(168,85,247,0.3)]",
  badgeBg: "bg-[#A855F7]/10 text-[#A855F7] border-[#A855F7]/30",
};
const CLIENTE: CategoryColor = {
  hex: "#00FF87",
  border: "border-[#00FF87]",
  text: "text-[#00FF87]",
  bg: "bg-[#00FF87]",
  bgGlow: "shadow-[0_0_15px_rgba(0,255,135,0.3)]",
  badgeBg: "bg-[#00FF87]/10 text-[#00FF87] border-[#00FF87]/30",
};

export function getCategoryColor(role: string | null | undefined): CategoryColor {
  const r = String(role || "").toLowerCase().trim();
  if (!r) return CLIENTE;
  if (r.includes("lojista") || r.includes("loja") || r.includes("store")) return LOJISTA;
  if (r.includes("prestador") || r.includes("provider") || r.includes("servi")) return PRESTADOR;
  if (r.includes("fornec") || r.includes("parceiro") || r.includes("b2b") || r.includes("supplier")) return FORNECEDOR;
  return CLIENTE;
}
