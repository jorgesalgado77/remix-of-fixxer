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
 * Cobre rotas públicas de perfil e conversa de chat.
 *
 *  /lojista/:id, /perfil/lojista, /perfil/lojista/:id     → lojista
 *  /prestador/:id, /perfil/prestador/:id                  → prestador
 *  /parceiro/:id, /fornecedor/:id, /perfil/fornecedor/:id → fornecedor
 *  /cliente/:id, /perfil/cliente/:id                      → cliente
 *  /chat/:peerId                                           → override sessionStorage
 */
export function categoryFromPathname(pathname: string): CategoryKey | null {
  if (!pathname) return null;
  if (pathname.startsWith("/lojista/") || pathname.startsWith("/perfil/lojista")) return "lojista";
  if (pathname.startsWith("/prestador/") || pathname.startsWith("/perfil/prestador")) return "prestador";
  if (
    pathname.startsWith("/parceiro/") ||
    pathname.startsWith("/fornecedor/") ||
    pathname.startsWith("/perfil/fornecedor") ||
    pathname.startsWith("/perfil/parceiro")
  ) return "fornecedor";
  if (pathname.startsWith("/cliente/") || pathname.startsWith("/perfil/cliente")) return "cliente";
  if (pathname.startsWith("/admin")) return "admin";
  if (pathname.startsWith("/chat/") && typeof window !== "undefined") {
    const override = sessionStorage.getItem("fixxer:context-category");
    if (override && ["lojista", "prestador", "fornecedor", "cliente", "admin"].includes(override)) {
      return override as CategoryKey;
    }
  }
  return null;
}

/**
 * Permite que uma página (ex.: chat) informe a categoria do interlocutor
 * para que o tema seja adotado imediatamente.
 */
export function setContextCategoryOverride(cat: CategoryKey | null) {
  if (typeof window === "undefined") return;
  if (cat) sessionStorage.setItem("fixxer:context-category", cat);
  else sessionStorage.removeItem("fixxer:context-category");
  window.dispatchEvent(new CustomEvent("fixxer:context-change"));
}

/**
 * Cor de contexto: prioriza a categoria do perfil/chat visitado; caso
 * contrário, usa a categoria do usuário logado. Reage a `fixxer:context-change`.
 */
export function useContextualCategory(pathname: string): CategoryKey {
  const own = useCurrentCategory();
  const [visited, setVisited] = useState<CategoryKey | null>(() => categoryFromPathname(pathname));
  useEffect(() => {
    setVisited(categoryFromPathname(pathname));
    const handler = () => setVisited(categoryFromPathname(pathname));
    window.addEventListener("fixxer:context-change", handler);
    window.addEventListener("storage", handler);
    return () => {
      window.removeEventListener("fixxer:context-change", handler);
      window.removeEventListener("storage", handler);
    };
  }, [pathname]);
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
