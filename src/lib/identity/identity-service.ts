import { supabaseExternal } from "@/lib/supabaseExternal";
import type { PublicProfileCategory } from "@/lib/public-profile-category";
import { resolvePublicProfileCategory } from "@/lib/public-profile-category";
import { CATEGORY_LABEL, CATEGORY_COLORS } from "@/lib/category-colors";
import type { CanonicalIdentity, ProfilePresentation, ResolvedProfile } from "./identity-types";

const IDENTITY_CACHE = new Map<string, { at: number; value: ResolvedProfile }>();
const TTL_MS = 600_000; // Aumentado para 10 minutos para maior estabilidade visual

// Chave para persistência em localStorage para evitar flash de "Usuário" no refresh
const PERSISTENCE_KEY = "fixxer_identity_cache_v1.2";

function getStoredIdentities(): Record<string, ResolvedProfile> {
  if (typeof window === "undefined") return {};
  try {
    const stored = window.localStorage.getItem(PERSISTENCE_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch (e) {
    return {};
  }
}

function storeIdentity(userId: string, profile: ResolvedProfile) {
  if (typeof window === "undefined") return;
  try {
    const stored = getStoredIdentities();
    stored[userId] = profile;
    window.localStorage.setItem(PERSISTENCE_KEY, JSON.stringify(stored));
  } catch (e) {
    console.warn("[IdentityService] Falha ao persistir identidade", e);
  }
}

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

  // PROMPT 23: Identidade Fixa para o Admin Master no modo Bypass
  const isMasterBypass = typeof window !== 'undefined' && localStorage.getItem('fixxer:master-bypass') === 'true';
  const isMasterId = userId === '6ba65048-803f-44f6-88d2-24d04fee1a0f' || userId === 'b3378b88-5c46-4e50-9c2e-4b7264a4d6e9';

  if (!options?.refresh) {
    const stored = getStoredIdentities();
    if (stored[userId]) {
      // Se for bypass, verificar se o nome no cache está correto (não "USUÁRIO")
      if (!isMasterBypass || (stored[userId].identity.displayName !== "Usuário" && stored[userId].identity.displayName !== "USUÁRIO")) {
        console.log(`[IdentityService] Cache LocalStorage HIT para ${userId}`);
        return stored[userId];
      }
    }

    const cached = IDENTITY_CACHE.get(userId);
    if (cached && Date.now() - cached.at < TTL_MS) {
      if (!isMasterBypass || (cached.value.identity.displayName !== "Usuário" && cached.value.identity.displayName !== "USUÁRIO")) {
        console.log(`[IdentityService] Cache Memory HIT para ${userId} (${(performance.now() - start).toFixed(2)}ms)`);
        return cached.value;
      }
    }
  }

  // 1. Buscar Perfil Mestre (Identidade) e Roles
  const { data: baseProfile, error: profileError } = await supabaseExternal
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .maybeSingle();

  

  if (profileError) {
    console.error(`[IdentityService] Erro ao buscar perfis para ${userId}:`, profileError);
  }


  // 1.1 Tentar buscar dados de especializações de forma isolada (Safe-check para tabelas ausentes)
  let store: any = null;
  let provider: any = null;
  let supplier: any = null;

  try {
    const { data: storeData } = await supabaseExternal.from("store_profiles").select("company_name, logo_url, city, state, is_verified, social_name").eq("user_id", userId).maybeSingle();
    store = storeData;
  } catch (e) { console.warn("[IdentityService] store_profiles indisponível"); }

  try {
    const { data: providerData } = await supabaseExternal.from("provider_profiles").select("display_name, avatar_url, city, state, is_verified").eq("user_id", userId).maybeSingle();
    provider = providerData;
  } catch (e) { console.warn("[IdentityService] provider_profiles indisponível"); }

  try {
    const { data: supplierData } = await supabaseExternal.from("supplier_profiles").select("company_name, logo_url, city, state, is_verified").eq("user_id", userId).maybeSingle();
    supplier = supplierData;
  } catch (e) { console.warn("[IdentityService] supplier_profiles indisponível"); }

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
    refresh: options?.refresh,
    specialized: { store, provider, supplier }
  });

  // 2. Resolver Categoria Principal


  // REGRA ÚNICA DE FALLBACK (CANONICAL PRIORITY)
  // 1. Master Bypass (Prompt 23)
  // 2. Nome profissional/empresa (se disponível)
  // 3. Nome de exibição customizado no perfil mestre
  // 4. Nome completo (perfil mestre)
  // 5. Fallback genérico (apenas se não houver dados reais)
  let displayName = (baseProfile ? "Usuário Fixxer" : "Usuário");
  
  if (isMasterBypass && isMasterId) {
    displayName = userId === '6ba65048-803f-44f6-88d2-24d04fee1a0f' ? "Admin Master" : "Prestador Teste";
    console.log(`[IdentityService] FORÇANDO Identidade Bypass para ${userId}: ${displayName}`);
  } else {
    displayName = 
      effectiveProfile.display_name?.trim() || 
      effectiveProfile.company_name?.trim() || 
      store?.company_name?.trim() || 
      store?.social_name?.trim() ||
      supplier?.company_name?.trim() || 
      provider?.display_name?.trim() || 
      effectiveProfile.full_name?.trim() || 
      displayName;
  }


  // REGRA ÚNICA DE FALLBACK PARA AVATAR
  // 1. Avatar do perfil mestre (profiles.avatar_url) - Prioridade máxima pois é o que o usuário edita no perfil global
  // 2. Logo da empresa (store_profiles.logo_url)
  // 3. Logo do fornecedor (supplier_profiles.logo_url)
  // 4. Foto profissional (provider_profiles.avatar_url)
  // 5. null (fallback UI)
  const avatarUrl = 
    effectiveProfile.avatar_url || 
    store?.logo_url || 
    supplier?.logo_url || 
    provider?.avatar_url || 
    null;

  // Validação rigorosa: se for uma string vazia ou placeholder conhecido, tratar como null
  const validatedAvatar = (typeof avatarUrl === 'string' && (avatarUrl.startsWith('http') || avatarUrl.startsWith('/'))) ? avatarUrl : null;

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
    avatarUrl: validatedAvatar,
    bio: effectiveProfile.bio || effectiveProfile.about_bio || null,
    isOfficial: !!(effectiveProfile as any).is_official,
    // CNPJ VERIFICADO REAL: Só é true se estiver marcado como verificado no perfil base ou especializado
    isVerified: !!(effectiveProfile.is_verified || store?.is_verified || provider?.is_verified || supplier?.is_verified),
    planId: effectiveProfile.plan_id || "free",
    createdAt: effectiveProfile.created_at || new Date().toISOString(),
    // REPUTAÇÃO REAL: Usa o karma_score do banco (Profiles) como fonte única de verdade
    karmaScore: effectiveProfile.karma_score != null ? Number(effectiveProfile.karma_score) : 0.0,
    lastActiveAt: effectiveProfile.last_active_at || null,
    verificationStatus: effectiveProfile.verification_status || (effectiveProfile.is_verified ? "verified" : "none"),
    verificationNote: effectiveProfile.verification_note || null,
  };

  // CÁLCULO DE ANTIGUIDADE REAL
  const createdDate = new Date(identity.createdAt);
  const diffTime = Math.abs(Date.now() - createdDate.getTime());
  const diffYears = diffTime / (1000 * 60 * 60 * 24 * 365.25);
  const activeLabel = diffYears >= 1 
    ? `Ativo há +${Math.floor(diffYears)} ano${Math.floor(diffYears) > 1 ? 's' : ''}` 
    : `Ativo desde ${createdDate.toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' })}`;

  const timeSinceActive = identity.lastActiveAt ? Date.now() - new Date(identity.lastActiveAt).getTime() : Infinity;
  const activityLabel = timeSinceActive < 5 * 60 * 1000 ? "Online" : 
                       timeSinceActive < 60 * 60 * 1000 ? "Ativo recentemente" : 
                       activeLabel;

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
  storeIdentity(userId, result);
  return result;
}
