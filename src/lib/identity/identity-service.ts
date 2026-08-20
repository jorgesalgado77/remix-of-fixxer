import { supabaseExternal } from "@/lib/supabaseExternal";
import type { PublicProfileCategory } from "@/lib/public-profile-category";
import { resolvePublicProfileCategory } from "@/lib/public-profile-category";
import { CATEGORY_LABEL, CATEGORY_COLORS } from "@/lib/category-colors";
import type { CanonicalIdentity, ProfilePresentation, ResolvedProfile } from "./identity-types";

const IDENTITY_CACHE = new Map<string, { at: number; value: ResolvedProfile }>();
const TTL_MS = 600_000; // Aumentado para 10 minutos para maior estabilidade visual

// Chave para persistência em localStorage para evitar flash de "Usuário" no refresh
const PERSISTENCE_KEY = "fixxer_identity_cache_v1.4";

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
  
  // PROMPT 25: Auditoria de Integridade de Tabelas Base
  const integrityCheck = async () => {
    if (typeof window === 'undefined') return;
    const cat = localStorage.getItem('fixxer:last-category');
    if (cat === 'prestador') {
      try {
        const { data, error } = await supabaseExternal.from("provider_profiles").select("id").eq("user_id", userId).maybeSingle();
        if (error || !data) {
          console.error("[Identity Integrity] FALHA: provider_profiles ausente para prestador", userId);
          window.dispatchEvent(new CustomEvent("fixxer:integrity-error", { 
            detail: { table: 'provider_profiles', userId } 
          }));
        }
      } catch (e) {
        console.error("[Identity Integrity] Erro crítico na checagem de integridade", e);
      }
    }
  };
  integrityCheck();

  console.log(`[IdentityService] Resolvendo para ${userId} (refresh: ${!!options?.refresh})`);

  // PROMPT 23: Identidade Fixa para o Admin Master no modo Bypass
  const isMasterBypass = typeof window !== 'undefined' && localStorage.getItem('fixxer:master-bypass') === 'true';
  const bypassUid = typeof window !== 'undefined' ? localStorage.getItem('fixxer:bypass-uid') : null;
  const isMasterId = userId === '6ba65048-803f-44f6-88d2-24d04fee1a0f' || 
                    (bypassUid && userId === bypassUid && localStorage.getItem('fixxer:last-category') === 'admin');

  if (isMasterBypass && isMasterId) {
    console.log(`[IdentityService] Bypass ATIVO para ${userId}. Ignorando cache para garantir exibição master.`);
  } else if (!options?.refresh) {
    const stored = getStoredIdentities();
    if (stored[userId]) {
      console.log(`[IdentityService] Cache LocalStorage HIT para ${userId}`);
      return stored[userId];
    }

    const cached = IDENTITY_CACHE.get(userId);
    if (cached && Date.now() - cached.at < TTL_MS) {
      console.log(`[IdentityService] Cache Memory HIT para ${userId} (${(performance.now() - start).toFixed(2)}ms)`);
      return cached.value;
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
    // PROMPT 25: Captura de Erro 23503 (Foreign Key)
    if ((profileError as any)?.code === '23503' || profileError.message?.includes('foreign key')) {
      window.dispatchEvent(new CustomEvent("fixxer:integrity-error", { 
        detail: { table: 'profiles (FK Violation)', userId, code: '23503' } 
      }));
    }
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
  // 1. DADOS REAIS DO PERFIL (Prio 1)
  // 2. Master Bypass (Prompt 23/24)
  // 3. Especializações (Store/Provider/Supplier)
  
  let displayName = "Usuário";
  
  // Prioridade 1: Dados do Perfil Mestre (profiles)
  if (effectiveProfile.display_name?.trim()) {
    displayName = effectiveProfile.display_name.trim();
  } 
  // Prioridade 2: Dados de Especialização (Store/Provider/Supplier)
  else if (store?.company_name?.trim() || store?.social_name?.trim()) {
    displayName = store.company_name?.trim() || store.social_name?.trim();
  }
  else if (supplier?.company_name?.trim()) {
    displayName = supplier.company_name.trim();
  }
  else if (provider?.display_name?.trim()) {
    displayName = provider.display_name.trim();
  }
  // Prioridade 3: Nome Completo
  else if (effectiveProfile.full_name?.trim()) {
    displayName = effectiveProfile.full_name.trim();
  }

  // REGRA ÚNICA DE FALLBACK PARA AVATAR
  let avatarUrl = effectiveProfile.avatar_url || effectiveProfile.logo_url || null;
  
  if (!avatarUrl) {
    avatarUrl = store?.logo_url || supplier?.logo_url || provider?.avatar_url || null;
  }

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
    email: effectiveProfile.email || null,
    avatarUrl: validatedAvatar,
    bio: effectiveProfile.bio || effectiveProfile.about_bio || null,
    isOfficial: !!(effectiveProfile as any).is_official,
    // CNPJ VERIFICADO REAL: Só é true se estiver marcado como verificado no perfil base ou especializado
    isVerified: !!(effectiveProfile.is_verified || store?.is_verified || provider?.is_verified || supplier?.is_verified),
    planId: effectiveProfile.plan_id || "free",
    createdAt: effectiveProfile.created_at || new Date().toISOString(),
    // REPUTAÇÃO REAL: Normaliza o karma_score. Se o banco usa escala de 0-5 ou 0-50, tratamos aqui.
    karmaScore: effectiveProfile.karma_score != null ? (Number(effectiveProfile.karma_score) > 5 ? Number(effectiveProfile.karma_score) / 10 : Number(effectiveProfile.karma_score)) : 0.0,
    lastActiveAt: effectiveProfile.last_active_at || null,
    verificationStatus: effectiveProfile.verification_status || (effectiveProfile.is_verified ? "verified" : "none"),
    verificationNote: effectiveProfile.verification_note || null,
    planRenewsAt: effectiveProfile.plan_renews_at || null,
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
