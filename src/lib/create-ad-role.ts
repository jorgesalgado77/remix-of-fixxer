/**
 * FIXXER — Helpers de identidade visual do CreateAdModal.
 *
 * Fonte única de verdade para:
 *  - Fallback seguro quando `useUserCategory()` não retorna papel válido
 *  - Título do modal / rótulo do botão de publicar por categoria
 *  - Cores oficiais (Ciano / Âmbar / Roxo / Verde)
 *
 * Mantido puro (sem React) para ser testável isoladamente.
 */
import { CATEGORY_COLORS, type CategoryKey } from "@/lib/category-colors";

export const VALID_ROLES: readonly CategoryKey[] = [
  "lojista",
  "prestador",
  "fornecedor",
  "cliente",
  "admin",
];

export type RoleCopy = { title: string; publish: string };

export const ROLE_COPY: Record<CategoryKey, RoleCopy> = {
  lojista:    { title: "📢 Criar Novo Anúncio Comercial",              publish: "🚀 Publicar Oferta"  },
  fornecedor: { title: "📢 Criar Novo Anúncio Comercial",              publish: "🚀 Publicar Oferta"  },
  prestador:  { title: "📢 Anunciar Pacote de Serviço / Mão de Obra",  publish: "🚀 Publicar Serviço" },
  cliente:    { title: "📢 Publicar Solicitação de Serviço / Pedido",  publish: "🚀 Publicar Pedido"  },
  admin:      { title: "📢 Criar Novo Anúncio",                        publish: "🚀 Publicar"         },
};

export type EffectiveCategoryResult = {
  category: CategoryKey;
  hex: string;
  copy: RoleCopy;
  /** true quando caímos no default por role inválida / ausência de sessão. */
  fallbackUsed: boolean;
  /** Mensagem amigável exibida no modal quando `fallbackUsed`. */
  fallbackMessage?: string;
};

const DEFAULT_CATEGORY: CategoryKey = "lojista";

/**
 * Resolve a categoria efetiva do CreateAdModal a partir do que veio de
 * `useUserCategory()` (papel real do usuário logado) com fallback seguro
 * para a categoria informada por prop e, por último, para "lojista".
 *
 * - Nunca lança.
 * - Nunca retorna categoria inválida.
 * - Retorna `fallbackUsed=true` quando o role recebido não é reconhecido.
 */
export function resolveEffectiveCategory(
  userCategory: string | null | undefined,
  propCategory: CategoryKey | undefined = DEFAULT_CATEGORY,
): EffectiveCategoryResult {
  const isValid = (v: unknown): v is CategoryKey =>
    typeof v === "string" && (VALID_ROLES as readonly string[]).includes(v);

  // Admins não têm identidade comercial: usa prop como pista, senão default.
  if (userCategory === "admin") {
    const cat = isValid(propCategory) ? propCategory : DEFAULT_CATEGORY;
    return {
      category: cat,
      hex: CATEGORY_COLORS[cat],
      copy: ROLE_COPY[cat],
      fallbackUsed: false,
    };
  }

  if (isValid(userCategory)) {
    return {
      category: userCategory,
      hex: CATEGORY_COLORS[userCategory],
      copy: ROLE_COPY[userCategory],
      fallbackUsed: false,
    };
  }

  const cat = isValid(propCategory) ? propCategory : DEFAULT_CATEGORY;
  return {
    category: cat,
    hex: CATEGORY_COLORS[cat],
    copy: ROLE_COPY[cat],
    fallbackUsed: true,
    fallbackMessage:
      "Não conseguimos identificar seu papel na plataforma. Usando modo padrão — atualize seu perfil para publicar com sua identidade correta.",
  };
}
