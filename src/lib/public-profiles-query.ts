import { supabaseExternal } from "@/lib/supabaseExternal";

/**
 * Fonte única de verdade das colunas seguras da view pública `profiles_public`.
 * NUNCA adicionar colunas não garantidas (ex.: karma_score / is_verified):
 * um único erro 42703 derruba a seção inteira do carrossel.
 */
export const PUBLIC_PROFILE_SAFE_COLS =
  "id, full_name, display_name, company_name, avatar_url, logo_url, banner_url, role, user_type, business_category, activity_branch, custom_branch, preferred_service, city, state, neighborhood, lat, lng, created_at";

/** Conjunto mínimo — usado quando a view estiver desatualizada (42703). */
export const PUBLIC_PROFILE_MINIMAL_COLS =
  "id, full_name, display_name, company_name, avatar_url, logo_url, role, user_type, city, state, lat, lng";

function isMissingColumnError(error: any) {
  return (
    !!error &&
    (error.code === "42703" ||
      String(error.message || "").toLowerCase().includes("does not exist"))
  );
}

/**
 * Busca perfis públicos de forma resiliente: se a view não tiver alguma coluna,
 * refaz a query com o conjunto mínimo em vez de quebrar a seção.
 */
export async function fetchPublicProfiles(options?: {
  limit?: number;
  orderBy?: string;
}): Promise<{ data: any[]; degraded: boolean; error: string | null }> {
  const limit = options?.limit ?? 100;
  const orderBy = options?.orderBy ?? "created_at";

  const run = async (cols: string, withOrder: boolean) => {
    let q = supabaseExternal.from("profiles_public").select(cols);
    if (withOrder) q = q.order(orderBy, { ascending: false });
    return await q.limit(limit);
  };

  let res = await run(PUBLIC_PROFILE_SAFE_COLS, true);

  if (isMissingColumnError(res.error)) {
    res = await run(PUBLIC_PROFILE_MINIMAL_COLS, false);
    if (!res.error) {
      return { data: (res.data as any[]) ?? [], degraded: true, error: null };
    }
  }

  if (res.error) {
    return { data: [], degraded: false, error: res.error.message ?? "Falha ao carregar perfis públicos." };
  }

  return { data: (res.data as any[]) ?? [], degraded: false, error: null };
}

/** Cache SWR simples em localStorage, compartilhado entre carrosséis. */
export function readSwrCache<T>(key: string): { items: T[]; ts: number } | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { items: T[]; ts: number };
    if (!parsed?.items?.length) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function writeSwrCache<T>(key: string, items: T[]) {
  if (typeof window === "undefined" || !items.length) return;
  try {
    window.localStorage.setItem(key, JSON.stringify({ items, ts: Date.now() }));
  } catch {
    /* noop */
  }
}
