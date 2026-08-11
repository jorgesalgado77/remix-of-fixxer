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
      *,
      user_roles (role)
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
    const specializedTables = ["provider_profiles", "store_profiles", "supplier_profiles"];
    const results = await Promise.all(
      specializedTables.map(table => 
        supabaseExternal
          .from(table)
          .select("display_name, name, full_name, company_name, city, state")
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
    displayName: base.display_name || base.full_name || base.company_name || base.name || (hasData ? "Usuário" : "Conversa"),
    fullName: base.full_name || base.company_name || null,
    avatarUrl: base.avatar_url || base.logo_url || null,
    bio: base.bio || base.description || null,
    isOfficial: !!base.is_official,
    isVerified: !!base.is_verified,
    planId: base.plan_id || "free",
    createdAt: base.created_at || new Date().toISOString(),
    karmaScore: base.karma_score ? Number(base.karma_score) : 5.0,

    lastActiveAt: base.last_active_at || null,
    verificationStatus: base.verification_status || (base.is_verified ? "verified" : "none"),
    verificationNote: base.verification_note || null,
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
    specializations: {}
  };

  IDENTITY_CACHE.set(userId, { at: Date.now(), value: result });
  return result;
}
