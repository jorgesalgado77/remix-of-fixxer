import { supabaseExternal } from "@/lib/supabaseExternal";
import type { PublicProfileCategory } from "@/lib/public-profile-category";
import { resolvePublicProfileCategory } from "@/lib/public-profile-category";
import { CATEGORY_LABEL, CATEGORY_COLORS } from "@/lib/category-colors";
import type { CanonicalIdentity, ProfilePresentation, ResolvedProfile } from "./identity-types";

const IDENTITY_CACHE = new Map<string, { at: number; value: ResolvedProfile }>();
const TTL_MS = 60_000;

function initialsOf(name: string): string {
  const clean = String(name || "").trim();
  if (!clean) return "?";
  const parts = clean.split(/\s+/).slice(0, 2);
  return parts.map((p) => p[0]?.toUpperCase() ?? "").join("") || clean[0]!.toUpperCase();
}

/**
 * Resolve a identidade completa de um usuário de forma canônica.
 */
export async function resolveIdentity(
  userId: string,
  options?: { refresh?: boolean }
): Promise<ResolvedProfile> {
  if (!userId) throw new Error("userId is required");

  if (!options?.refresh) {
    const cached = IDENTITY_CACHE.get(userId);
    if (cached && Date.now() - cached.at < TTL_MS) return cached.value;
  }

  // 1. Buscar Perfil Mestre (Identidade) e Roles
  const [profileRes, rolesRes] = await Promise.all([
    supabaseExternal.from("profiles").select("*").eq("id", userId).maybeSingle(),
    supabaseExternal.from("user_roles").select("role").eq("user_id", userId)
  ]);

  const profile = profileRes.data || {};
  const roles = (rolesRes.data || []).map((r: any) => r.role);

  // Se não encontrar no profiles, tenta no profiles_public (fallback de RLS)
  let baseProfile = profile;
  if (!profileRes.data) {
    const { data: publicData } = await supabaseExternal
      .from("profiles_public")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();
    if (publicData) baseProfile = publicData;
  }

  // 2. Resolver Categoria Principal (Aproveita a lógica existente)
  const mainCategory = await resolvePublicProfileCategory(userId, {
    profile: baseProfile,
    refresh: options?.refresh
  });

  // 3. Construir Identidade Canônica
  const identity: CanonicalIdentity = {
    id: userId,
    displayName: baseProfile.display_name || baseProfile.full_name || "Usuário",
    fullName: baseProfile.full_name || null,
    avatarUrl: baseProfile.avatar_url || null,
    bio: baseProfile.bio || null,
    isOfficial: !!baseProfile.is_official,
    isVerified: !!baseProfile.is_verified
  };

  // 4. Construir Apresentação
  const presentation: ProfilePresentation = {
    name: identity.displayName,
    initials: initialsOf(identity.displayName),
    avatarUrl: identity.avatarUrl,
    category: mainCategory,
    themeColor: CATEGORY_COLORS[mainCategory] || CATEGORY_COLORS.cliente,
    label: CATEGORY_LABEL[mainCategory] || "Usuário",
    badges: []
  };

  const result: ResolvedProfile = {
    identity,
    roles,
    mainCategory,
    presentation,
    specializations: {}
  };

  IDENTITY_CACHE.set(userId, { at: Date.now(), value: result });
  return result;
}
