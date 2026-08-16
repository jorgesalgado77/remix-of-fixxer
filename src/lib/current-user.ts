// ============================================================
// Identidade e autorização — fonte única de verdade
// ============================================================
import { useEffect, useState } from "react";
import { supabaseExternal } from "@/lib/supabaseExternal";
import type { User } from "@supabase/supabase-js";

type Category = "admin" | "lojista" | "prestador" | "fornecedor" | "cliente" | "user";

let cachedUser: User | null = null;
let cachedAdmin: boolean | null = null;
let cachedCategory: Category | null = null;
let inflight: Promise<User | null> | null = null;

function normalizeCategory(raw?: string | null): Category {
  const r = (raw || "").toLowerCase();
  if (r.includes("admin")) return "admin";
  if (r.includes("prestador")) return "prestador";
  if (r.includes("parceiro") || r.includes("fornecedor") || r.includes("b2b")) return "fornecedor";
  if (r.includes("cliente") || r.includes("casual") || r.includes("final")) return "cliente";
  if (r.includes("lojista")) return "lojista";
  if (r.includes("user")) return "user";
  return "lojista";
}

export async function getCurrentUser(force = false): Promise<User | null> {
  if (!force && cachedUser) return cachedUser;
  if (inflight && !force) return inflight;
  
  inflight = (async () => {
    try {
      // Prioridade absoluta para a sessão real do Supabase Externo (Real Data First)
      const { data: { session } } = await supabaseExternal.auth.getSession();
      
      if (session?.user) {
        console.log("[current-user] Usuário real autenticado via Supabase Externo.");
        cachedUser = session.user;
        
        // Sincronização imediata de categoria baseada no banco real
        try {
          const { data: profile } = await supabaseExternal
            .from("profiles")
            .select("role, user_type, business_category")
            .eq("id", session.user.id)
            .maybeSingle();
          
          if (profile) {
            const raw = ((profile as any)?.role || (profile as any)?.user_type || (profile as any)?.business_category || "") as string;
            cachedCategory = normalizeCategory(raw);
            cachedAdmin = cachedCategory === 'admin' || session.user.email === 'jorgericardosalgado@gmail.com';
            console.log("[current-user] Categoria real resolvida:", cachedCategory);
          }
        } catch (err) {
          console.warn("[current-user] Falha ao sincronizar categoria real:", err);
        }

        return session.user;
      }

      // Fallback para Master Bypass apenas se não houver sessão ativa
      const isMasterBypass = typeof window !== 'undefined' && localStorage.getItem('fixxer:master-bypass') === 'true';

      if (isMasterBypass) {
        const category = (localStorage.getItem('fixxer:last-category') as Category) || 'admin';
        const storedUid = localStorage.getItem('fixxer:bypass-uid');
        
        const email = (category === 'admin') 
          ? 'jorgericardosalgado@gmail.com' 
          : 'jorgecriare2021@gmail.com';
        
        const isMaster = email === 'jorgericardosalgado@gmail.com';
        const defaultUid = isMaster 
          ? '6ba65048-803f-44f6-88d2-24d04fee1a0f' 
          : 'b3378b88-5c46-4e50-9c2e-4b7264a4d6e9';
        
        const currentUid = storedUid || defaultUid;

        let displayName = isMaster ? 'Admin Master' : 'Usuário';
        let avatarUrl = null;

        if (typeof window !== 'undefined') {
          try {
            const cachedRaw = localStorage.getItem('fixxer_identity_cache_v1.2');
            const cached = cachedRaw ? JSON.parse(cachedRaw) : {};
            const res = cached[currentUid];
            if (res) {
              displayName = res.identity.displayName || displayName;
              avatarUrl = res.identity.avatarUrl || avatarUrl;
            }
          } catch (e) {
            console.warn("[current-user] Erro ao ler cache de identidade:", e);
          }
        }

        const masterData: User = {
          id: currentUid,
          email: email,
          app_metadata: { provider: 'email', providers: ['email'] },
          user_metadata: { 
            display_name: displayName,
            full_name: displayName,
            avatar_url: avatarUrl,
            role: category,
            category: category
          },
          aud: 'authenticated',
          created_at: new Date().toISOString()
        } as any;

        cachedUser = masterData;
        cachedCategory = category;
        cachedAdmin = category === 'admin' || email === 'jorgericardosalgado@gmail.com';
        
        return masterData;
      }

      // Garantia final via getUser (API Call)
      if (typeof navigator !== 'undefined' && navigator.onLine) {
        const { data: { user } } = await supabaseExternal.auth.getUser();
        if (user) {
          cachedUser = user;
          return user;
        }
      }
      
      return null;
    } catch (e) {
      console.warn("[current-user] Falha crítica ao recuperar usuário:", e);
      return null;
    } finally {
      inflight = null;
    }
  })();
  return inflight;
}

export async function getCurrentUserId(): Promise<string | null> {
  const u = await getCurrentUser();
  return u?.id ?? null;
}

export async function getCurrentUserEmail(): Promise<string | null> {
  const u = await getCurrentUser();
  return u?.email ?? null;
}

export async function isCurrentUserAdmin(force = false): Promise<boolean> {
  if (!force && cachedAdmin !== null) return cachedAdmin;
  
  const user = await getCurrentUser(force);
  const uid = user?.id;
  const email = user?.email?.toLowerCase();

  const isMasterBypass = typeof window !== 'undefined' && localStorage.getItem('fixxer:master-bypass') === 'true';
  const localCategory = typeof window !== 'undefined' ? localStorage.getItem('fixxer:last-category') : null;

  // REGRA MESTRA: Apenas o e-mail oficial do Admin Master tem acesso administrativo
  if (email === 'jorgericardosalgado@gmail.com') {
    cachedAdmin = true;
    return true;
  }

  // Se estiver em bypass mas NÃO for o e-mail master, não é admin (ex: jorgecriare)
  if (isMasterBypass && localCategory === 'admin' && email === 'jorgericardosalgado@gmail.com') {
    cachedAdmin = true;
    return true;
  }

  if (isMasterBypass && email !== 'jorgericardosalgado@gmail.com') {
    cachedAdmin = false;
    return false;
  }

  if (!uid) { 
    cachedAdmin = false; 
    return false; 
  }
  
  try {
    const { data, error } = await supabaseExternal
      .from("user_roles")
      .select("role")
      .eq("user_id", uid)
      .eq("role", "admin")
      .maybeSingle();
    
    if (error) {
      console.warn("[Identity] Erro na consulta de privilégios:", error.message);
      // Se houver erro de rede/RLS, confiamos no bypass master se houver, senão false
      return cachedAdmin || false;
    }
    cachedAdmin = !!data;
  } catch (err) {
    cachedAdmin = false;
  }
  return cachedAdmin;
}

export function isCurrentUserAdminSync(): boolean {
  if (cachedAdmin !== null) return cachedAdmin;
  
  if (typeof window !== 'undefined') {
    const isMasterBypass = localStorage.getItem('fixxer:master-bypass') === 'true';
    const cat = localStorage.getItem('fixxer:last-category');
    const storedUid = localStorage.getItem('fixxer:bypass-uid');
    
    // Apenas o e-mail/ID do Master tem acesso admin
    const masterId = '6ba65048-803f-44f6-88d2-24d04fee1a0f';
    if (isMasterBypass && cat === 'admin' && storedUid === masterId) {
      return true;
    }
  }
  return false;
}

export async function getCurrentCategory(force = false): Promise<Category> {
  if (!force && cachedCategory) return cachedCategory;
  
  const isMasterBypass = typeof window !== 'undefined' && localStorage.getItem('fixxer:master-bypass') === 'true';
  const localCategory = typeof window !== 'undefined' ? localStorage.getItem('fixxer:last-category') as Category : null;

  if (isMasterBypass && localCategory) {
    cachedCategory = localCategory;
    return localCategory;
  }

  const user = await getCurrentUser(force);
  const uid = user?.id;
  const email = user?.email?.toLowerCase();
  
  if (email === 'jorgericardosalgado@gmail.com' || uid === '6ba65048-803f-44f6-88d2-24d04fee1a0f') {
    cachedCategory = "admin";
    return "admin";
  }

  if (email === 'jorgecriare2021@gmail.com' || uid === 'b3378b88-5c46-4e50-9c2e-4b7264a4d6e9') {
    cachedCategory = "prestador";
    return "prestador";
  }

  if (!uid) { cachedCategory = "lojista"; return cachedCategory; }

  try {
    const { data, error } = await supabaseExternal
      .from("profiles")
      .select("role, user_type, business_category")
      .eq("id", uid)
      .maybeSingle();
    
    if (error) throw error;
    
    const raw = ((data as any)?.role || (data as any)?.user_type || (data as any)?.business_category || "") as string;
    cachedCategory = normalizeCategory(raw);
  } catch {
    if (localCategory) return localCategory;
    cachedCategory = "lojista";
  }
  return cachedCategory;
}

export function clearCurrentUserCache() {
  cachedUser = null;
  cachedAdmin = null;
  cachedCategory = null;
}

if (typeof window !== "undefined") {
  // Inicialização bruta: Se houver bypass e estivermos em /auth, ejetar imediatamente ANTES de qualquer evento
  const checkInitialEjection = async () => {
    const isAuthPath = window.location.pathname.startsWith('/auth');
    const hasBypass = localStorage.getItem('fixxer:master-bypass') === 'true';
    const cat = localStorage.getItem('fixxer:last-category');
    
    if (hasBypass && isAuthPath && cat) {
      const target = cat === 'admin' ? '/admin/infoprodutos' : `/feed/${cat}`;
      console.warn("[Identity] Ejeção Bruta na Inicialização (Bypass Ativo):", target);
      window.location.replace(window.location.origin + target);
    }
  };
  checkInitialEjection();

  supabaseExternal.auth.onAuthStateChange(async (event, session) => {
    console.log(`[Identity] Evento Auth: ${event}`, !!session);
    
    if (event === "SIGNED_OUT") {
      if (localStorage.getItem('fixxer:master-bypass') === 'true') return;
      clearCurrentUserCache();
    } else if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED" || event === "USER_UPDATED") {
      if (session?.user) {
        cachedUser = session.user;
      }
      
      const isAuthPath = window.location.pathname.startsWith('/auth');
      const hasBypass = localStorage.getItem('fixxer:master-bypass') === 'true';
      
      if ((session || hasBypass) && isAuthPath) {
        const cat = await getCurrentCategory(true);
        const target = cat === 'admin' ? '/admin/infoprodutos' : `/feed/${cat}`;
        console.warn("[Identity] Sessão/Bypass detectado em /auth, forçando saída absoluta.");
        window.location.replace(window.location.origin + target);
      }
    }
    
    try { window.dispatchEvent(new Event("fixxer:identity-change")); } catch {}
  });
}

// React hooks seguem o mesmo padrão
export function useCurrentUser() {
  const [state, setState] = useState<{ user: User | null; loading: boolean }>(
    () => ({ user: cachedUser, loading: cachedUser === null })
  );
  useEffect(() => {
    let alive = true;
    getCurrentUser().then((u) => { if (alive) setState({ user: u, loading: false }); });
    const onChange = () => {
      getCurrentUser(true).then((u) => { if (alive) setState({ user: u, loading: false }); });
    };
    window.addEventListener("fixxer:identity-change", onChange);
    return () => { alive = false; window.removeEventListener("fixxer:identity-change", onChange); };
  }, []);
  return state;
}

export function useCurrentUserId(): string | null {
  const { user } = useCurrentUser();
  return user?.id ?? null;
}

export function useIsAdmin(): { isAdmin: boolean; loading: boolean } {
  const [state, setState] = useState<{ isAdmin: boolean; loading: boolean }>(
    () => ({ isAdmin: cachedAdmin === true, loading: cachedAdmin === null })
  );
  useEffect(() => {
    let alive = true;
    isCurrentUserAdmin().then((v) => { if (alive) setState({ isAdmin: v, loading: false }); });
    const onChange = () => {
      isCurrentUserAdmin(true).then((v) => { if (alive) setState({ isAdmin: v, loading: false }); });
    };
    window.addEventListener("fixxer:identity-change", onChange);
    return () => { alive = false; window.removeEventListener("fixxer:identity-change", onChange); };
  }, []);
  return state;
}

export function useUserCategory(): Category {
  const [cat, setCat] = useState<Category>(cachedCategory ?? "lojista");
  useEffect(() => {
    let alive = true;
    getCurrentCategory().then((c) => { if (alive) setCat(c); });
    const onChange = () => {
      getCurrentCategory(true).then((c) => { if (alive) setCat(c); });
    };
    window.addEventListener("fixxer:identity-change", onChange);
    return () => { alive = false; window.removeEventListener("fixxer:identity-change", onChange); };
  }, []);
  return cat;
}

export type { Category };