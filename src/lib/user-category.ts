import { useEffect, useState } from "react";
import { CATEGORY_COLORS, type CategoryKey } from "@/lib/category-colors";

/**
 * Lê a categoria armazenada localmente e normaliza para as chaves oficiais
 * do design system (lojista | prestador | fornecedor | cliente | admin).
 */
export function resolveCurrentCategory(): CategoryKey {
  if (typeof window === "undefined") return "lojista";
  const raw = (
    localStorage.getItem("fixxer_user_category") ||
    localStorage.getItem("fixxer_user_role") ||
    ""
  ).toLowerCase();
  const email = (localStorage.getItem("fixxer_user_email") || "").toLowerCase();
  if (email === "jorgericardosalgado@gmail.com" || raw.includes("admin")) return "admin";
  if (raw.includes("lojista")) return "lojista";
  if (raw.includes("prestador")) return "prestador";
  if (raw.includes("parceiro") || raw.includes("fornecedor") || raw.includes("b2b")) return "fornecedor";
  if (raw.includes("cliente") || raw.includes("casual") || raw.includes("final")) return "cliente";
  return "lojista";
}

/**
 * Hook reativo: retorna a categoria atual e reage a mudanças em outras abas
 * ou dentro da própria aba (via evento customizado `fixxer:category-change`).
 */
export function useCurrentCategory(): CategoryKey {
  const [cat, setCat] = useState<CategoryKey>(() => resolveCurrentCategory());
  useEffect(() => {
    const handler = () => setCat(resolveCurrentCategory());
    window.addEventListener("storage", handler);
    window.addEventListener("fixxer:category-change", handler);
    return () => {
      window.removeEventListener("storage", handler);
      window.removeEventListener("fixxer:category-change", handler);
    };
  }, []);
  return cat;
}

/**
 * Deriva a categoria de um perfil visitado a partir do pathname.
 * Retorna `null` quando a rota não é um perfil público — nesse caso
 * a cor a aplicar é a do usuário logado.
 *
 *  /lojista/:id, /perfil/lojista      → lojista
 *  /prestador/:id                     → prestador
 *  /parceiro/:id, /fornecedor/:id     → fornecedor
 *  /cliente/:id                       → cliente
 */
export function categoryFromPathname(pathname: string): CategoryKey | null {
  if (!pathname) return null;
  if (pathname.startsWith("/lojista/") || pathname === "/perfil/lojista") return "lojista";
  if (pathname.startsWith("/prestador/")) return "prestador";
  if (pathname.startsWith("/parceiro/") || pathname.startsWith("/fornecedor/")) return "fornecedor";
  if (pathname.startsWith("/cliente/")) return "cliente";
  return null;
}

/**
 * Cor de contexto: prioriza a categoria do perfil visitado (quando a rota
 * for de perfil público); caso contrário, usa a categoria do usuário logado.
 */
export function useContextualCategory(pathname: string): CategoryKey {
  const own = useCurrentCategory();
  const visited = categoryFromPathname(pathname);
  return visited ?? own;
}

/**
 * Retorna um objeto style pronto para aplicar a um wrapper e sobrescrever
 * as variáveis semânticas globais (--primary, --ring, --accent-foreground)
 * com a cor oficial da categoria informada.
 */
export function getCategoryCssVars(cat: CategoryKey): React.CSSProperties {
  const hex = CATEGORY_COLORS[cat];
  return {
    ["--primary" as any]: hex,
    ["--ring" as any]: hex,
    ["--accent-foreground" as any]: hex,
    ["--sidebar-primary" as any]: hex,
    ["--sidebar-ring" as any]: hex,
  };
}
