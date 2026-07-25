import { useEffect, useState } from "react";
import { CATEGORY_COLORS, type CategoryKey } from "@/lib/category-colors";
import { getCurrentCategory } from "@/lib/current-user";

/**
 * Categoria do usuário logado — resolvida via sessão Supabase +
 * public.user_roles/profiles. NÃO usa mais localStorage nem email
 * hardcoded como fonte. A promise é cacheada no módulo current-user.
 *
 * Retorno síncrono default para SSR/primeiro render: "lojista".
 */
export function resolveCurrentCategory(): CategoryKey {
  return "lojista";
}

/**
 * Hook reativo: retorna a categoria resolvida pelo backend. Atualiza
 * automaticamente quando `fixxer:identity-change` é disparado (login,
 * logout, troca de sessão).
 */
export function useCurrentCategory(): CategoryKey {
  const [cat, setCat] = useState<CategoryKey>("lojista");
  useEffect(() => {
    let alive = true;
    getCurrentCategory().then((c) => { if (alive) setCat(c as CategoryKey); });
    const handler = () => {
      getCurrentCategory(true).then((c) => { if (alive) setCat(c as CategoryKey); });
    };
    window.addEventListener("fixxer:identity-change", handler);
    window.addEventListener("fixxer:category-change", handler);
    return () => {
      alive = false;
      window.removeEventListener("fixxer:identity-change", handler);
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
