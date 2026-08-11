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

  const start = performance.now();
  console.log(`[IdentityService] Resolvendo para ${userId} (refresh: ${!!options?.refresh})`);

  if (!options?.refresh) {
    const cached = IDENTITY_CACHE.get(userId);
    if (cached && Date.now() - cached.at < TTL_MS) {
      console.log(`[IdentityService] Cache HIT para ${userId} (${(performance.now() - start).toFixed(2)}ms)`);
      return cached.value;
    }
  }

  // 1. Buscar Perfil Mestre (Identidade) e Roles
  // Removido joins com tabelas especializadas que podem não existir no banco do usuário
  const { data: baseProfile, error: profileError } = await supabaseExternal
    .from("profiles")
    .select(`
      id, display_name, full_name, avatar_url, bio, about_bio, is_official, is_verified, plan_id, created_at, karma_score, last_active_at, verification_status, verification_note,
      user_roles (role)
    `)
    .eq("id", userId)
    .maybeSingle();

  if (profileError) {
    console.error(`[IdentityService] Erro ao buscar perfis para ${userId}:`, profileError);
  }

  let roles: string[] = [];
  const effectiveProfile: any = baseProfile || {};

  if (baseProfile) {
    roles = (baseProfile.user_roles || []).map((r: any) => r.role);
  } else {
    // Fallback para roles se profiles falhar ou não retornar dados
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

  // 2. Tentar buscar dados de especializações de forma isolada (Safe-check para tabelas ausentes)
  let store: any = null;
  let provider: any = null;
  let supplier: any = null;

  try {
    const { data: storeData } = await supabaseExternal.from("store_profiles").select("company_name, logo_url, city, state").eq("user_id", userId).maybeSingle();
    store = storeData;
  } catch (e) { console.warn("[IdentityService] store_profiles indisponível"); }

  try {
    const { data: providerData } = await supabaseExternal.from("provider_profiles").select("display_name, avatar_url, city, state").eq("user_id", userId).maybeSingle();
    provider = providerData;
  } catch (e) { console.warn("[IdentityService] provider_profiles indisponível"); }

  try {
    const { data: supplierData } = await supabaseExternal.from("supplier_profiles").select("company_name, logo_url, city, state").eq("user_id", userId).maybeSingle();
    supplier = supplierData;
  } catch (e) { console.warn("[IdentityService] supplier_profiles indisponível"); }

  // REGRA ÚNICA DE FALLBACK (CANONICAL PRIORITY)
  // 1. Nome profissional/empresa (se disponível)
  // 2. Nome de exibição customizado no perfil mestre
  // 3. Nome completo (perfil mestre)
  // 4. Fallback genérico
  const displayName = 
    store?.company_name || 
    supplier?.company_name || 
    provider?.display_name || 
    effectiveProfile.display_name || 
    effectiveProfile.full_name || 
    (baseProfile ? "Usuário" : "Usuário Externo");

  // REGRA ÚNICA DE FALLBACK PARA AVATAR
  // 1. Logo da empresa (lojista/fornecedor)
  // 2. Foto profissional (prestador)
  // 3. Avatar do perfil mestre
  // 4. null (fallback UI)
  const avatarUrl = 
    store?.logo_url || 
    supplier?.logo_url || 
    provider?.avatar_url || 
    effectiveProfile.avatar_url || 
    null;

  console.log(`[IdentityService] Identidade resolvida para ${userId}:`, {
    displayName,
    hasAvatar: !!avatarUrl,
    category: mainCategory,
    roles,
    duration: `${(performance.now() - start).toFixed(2)}ms`
  });

  const identity: CanonicalIdentity = {
    id: userId,
    displayName,
    fullName: effectiveProfile.full_name || null,
    avatarUrl,
    bio: effectiveProfile.bio || effectiveProfile.about_bio || null,
    isOfficial: !!effectiveProfile.is_official,
    isVerified: !!(effectiveProfile.is_verified || store?.is_verified || provider?.is_verified || supplier?.is_verified),
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
