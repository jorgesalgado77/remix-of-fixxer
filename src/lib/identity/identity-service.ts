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
  let effectiveProfile = baseProfile;

  if (profileError || !baseProfile) {
    const { data: publicData } = await supabaseExternal
      .from("profiles_public")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();
    
    if (publicData) effectiveProfile = publicData;
    
    const { data: rolesData } = await supabaseExternal
      .from("user_roles")
      .select("role")
      .eq("user_id", userId);
    roles = (rolesData || []).map((r: any) => r.role);
  } else {
    roles = (baseProfile.user_roles || []).map((r: any) => r.role);
  }

  if (!effectiveProfile) {
    // Busca apenas campos TÉCNICOS/ESPECÍFICOS das tabelas especializadas.
    // Identidade visual (nome, avatar, bio) DEVE vir de profiles.
    const specializedTables = ["provider_profiles", "store_profiles", "supplier_profiles"];
    const results = await Promise.all(
      specializedTables.map(table => 
        supabaseExternal
          .from(table)
          .select("city, state") // Removido display_name, name, full_name, company_name como fallbacks
          .eq("user_id", userId)
          .maybeSingle()
      )
    );
    
    for (let i = 0; i < results.length; i++) {
      const specData = results[i].data;
      if (specData) {
        effectiveProfile = { ...specData, id: userId };
        const tableName = specializedTables[i].split("_")[0];
        (effectiveProfile as any)[`_${tableName}`] = specData;
        break;
      }
    }
  }

  const base = effectiveProfile || {};

  const mainCategory = await resolvePublicProfileCategory(userId, {
    profile: baseProfile,
    refresh: options?.refresh
  });

  const hasData = effectiveProfile && Object.keys(effectiveProfile).length > 0;

  const identity: CanonicalIdentity = {
    id: userId,
    // Prioridade absoluta: profiles -> fallback genérico. Especializadas NUNCA definem nome/avatar.
    displayName: baseProfile?.display_name || baseProfile?.full_name || (Array.isArray(baseProfile?.store_profiles) ? baseProfile.store_profiles[0]?.company_name : baseProfile?.store_profiles?.company_name) || (Array.isArray(baseProfile?.provider_profiles) ? baseProfile.provider_profiles[0]?.display_name : baseProfile?.provider_profiles?.display_name) || (Array.isArray(baseProfile?.supplier_profiles) ? baseProfile.supplier_profiles[0]?.company_name : baseProfile?.supplier_profiles?.company_name) || (hasData ? "Usuário" : "Carregando..."),
    fullName: baseProfile?.full_name || null,
    avatarUrl: baseProfile?.avatar_url || (Array.isArray(baseProfile?.store_profiles) ? baseProfile.store_profiles[0]?.logo_url : baseProfile?.store_profiles?.logo_url) || (Array.isArray(baseProfile?.provider_profiles) ? baseProfile.provider_profiles[0]?.avatar_url : baseProfile?.provider_profiles?.avatar_url) || (Array.isArray(baseProfile?.supplier_profiles) ? baseProfile.supplier_profiles[0]?.logo_url : baseProfile?.supplier_profiles?.logo_url) || null,
    bio: baseProfile?.bio || baseProfile?.about_bio || null,
    isOfficial: !!baseProfile?.is_official,
    isVerified: !!baseProfile?.is_verified,
    planId: baseProfile?.plan_id || "free",
    createdAt: baseProfile?.created_at || new Date().toISOString(),
    karmaScore: baseProfile?.karma_score ? Number(baseProfile.karma_score) : 5.0,

    lastActiveAt: baseProfile?.last_active_at || null,
    verificationStatus: baseProfile?.verification_status || (baseProfile?.is_verified ? "verified" : "none"),
    verificationNote: baseProfile?.verification_note || null,
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
  if (identity.planId === "premium") presentation.badges.push("Ouro");

  const result: ResolvedProfile = {
    identity,
    roles,
    mainCategory,
    presentation,
    specializations: {
      store: Array.isArray(baseProfile?.store_profiles) ? baseProfile.store_profiles[0] : baseProfile?.store_profiles,
      provider: Array.isArray(baseProfile?.provider_profiles) ? baseProfile.provider_profiles[0] : baseProfile?.provider_profiles,
      supplier: Array.isArray(baseProfile?.supplier_profiles) ? baseProfile.supplier_profiles[0] : baseProfile?.supplier_profiles,
    }
  };

  IDENTITY_CACHE.set(userId, { at: Date.now(), value: result });
  return result;
}
