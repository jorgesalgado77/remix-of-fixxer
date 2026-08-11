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

  // 1. Buscar Perfil Mestre (Identidade) e Roles com Joins
  const { data: baseProfile, error: profileError } = await supabaseExternal
    .from("profiles")
    .select(`
      id, display_name, full_name, avatar_url, bio, about_bio, is_official, is_verified, plan_id, created_at, karma_score, last_active_at, verification_status, verification_note,
      user_roles (role),
      store_profiles (company_name, logo_url, city, state),
      provider_profiles (display_name, avatar_url, city, state),
      supplier_profiles (company_name, logo_url, city, state)
    `)
    .eq("id", userId)
    .maybeSingle();

  let roles: string[] = [];
  const effectiveProfile: any = baseProfile || {};

  if (!profileError && baseProfile) {
    roles = (baseProfile.user_roles || []).map((r: any) => r.role);
  } else {
    // Fallback para roles se profiles falhar
    const { data: rolesData } = await supabaseExternal
      .from("user_roles")
      .select("role")
      .eq("user_id", userId);
    roles = (rolesData || []).map((r: any) => r.role);
  }

  const mainCategory = await resolvePublicProfileCategory(userId, {
    profile: baseProfile,
    refresh: options?.refresh
  });

  // Helper para extrair dados de arrays ou objetos (Supabase joins podem retornar ambos)
  const extract = (val: any) => Array.isArray(val) ? val[0] : val;

  const store = extract(effectiveProfile.store_profiles);
  const provider = extract(effectiveProfile.provider_profiles);
  const supplier = extract(effectiveProfile.supplier_profiles);

  const identity: CanonicalIdentity = {
    id: userId,
    displayName: 
      effectiveProfile.display_name || 
      effectiveProfile.full_name || 
      store?.company_name || 
      provider?.display_name || 
      supplier?.company_name || 
      (baseProfile ? "Usuário" : "Carregando..."),
    fullName: effectiveProfile.full_name || null,
    avatarUrl: 
      effectiveProfile.avatar_url || 
      store?.logo_url || 
      provider?.avatar_url || 
      supplier?.logo_url || 
      null,
    bio: effectiveProfile.bio || effectiveProfile.about_bio || null,
    isOfficial: !!effectiveProfile.is_official,
    isVerified: !!effectiveProfile.is_verified,
    planId: effectiveProfile.plan_id || "free",
    createdAt: effectiveProfile.created_at || new Date().toISOString(),
    karmaScore: effectiveProfile.karma_score ? Number(effectiveProfile.karma_score) : 5.0,
    lastActiveAt: effectiveProfile.last_active_at || null,
    verificationStatus: effectiveProfile.verification_status || (effectiveProfile.is_verified ? "verified" : "none"),
    verificationNote: effectiveProfile.verification_note || null,
  };

  const timeSinceActive = identity.lastActiveAt ? Date.now() - new Date(identity.lastActiveAt).getTime() : Infinity;
  const activityLabel = timeSinceActive < 5 * 60 * 1000 ? "Online" : 
                       timeSinceActive < 60 * 60 * 1000 ? "Ativo recentemente" : 
                       identity.lastActiveAt ? "Visto em " + new Date(identity.lastActiveAt).toLocaleDateString("pt-BR") :
                       "Ativo na plataforma";

  const presentation: ProfilePresentation = {
    name: identity.displayName,
    initials: initialsOf(identity.displayName),
    avatarUrl: identity.avatarUrl,
    category: mainCategory,
    themeColor: CATEGORY_COLORS[mainCategory] || CATEGORY_COLORS.cliente,
    label: CATEGORY_LABEL[mainCategory] || "Usuário",
    badges: [],
    activityLabel
  };

  if (identity.isVerified) presentation.badges.push("Verificado");
  if (identity.planId === "premium" || identity.planId === "pro") presentation.badges.push("Ouro");

  const result: ResolvedProfile = {
    identity,
    roles,
    mainCategory,
    presentation,
    specializations: { store, provider, supplier }
  };

  IDENTITY_CACHE.set(userId, { at: Date.now(), value: result });
  return result;
}
