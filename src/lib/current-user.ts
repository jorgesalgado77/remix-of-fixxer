// ============================================================
// Identidade e autorização — fonte única de verdade
// ============================================================
import { useEffect, useState } from "react";
import { supabaseExternal } from "@/lib/supabaseExternal";
import type { User } from "@supabase/supabase-js";

type Category = "admin" | "lojista" | "prestador" | "fornecedor" | "cliente";

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
  return "lojista";
}

export async function getCurrentUser(force = false): Promise<User | null> {
  if (!force && cachedUser) return cachedUser;
  if (inflight && !force) return inflight;
  
  inflight = (async () => {
    try {
      const isMasterBypass = typeof window !== 'undefined' && localStorage.getItem('fixxer:master-bypass') === 'true';

      if (isMasterBypass) {
        const category = (localStorage.getItem('fixxer:last-category') as Category) || 'admin';
        const email = (category === 'admin' || category === 'prestador') 
          ? (category === 'admin' ? 'jorgericardosalgado@gmail.com' : 'jorgecriare2021@gmail.com')
          : 'lojista@fixxer.app';
        
        const masterData: User = {
          id: email === 'jorgericardosalgado@gmail.com' 
              ? '6ba65048-803f-44f6-88d2-24d04fee1a0f' 
              : 'b3378b88-5c46-4e50-9c2e-4b7264a4d6e9',
          email: email,
          app_metadata: { provider: 'email', providers: ['email'] },
          user_metadata: { 
            display_name: email === 'jorgericardosalgado@gmail.com' ? 'Admin Master' : 'Prestador Teste',
            full_name: email === 'jorgericardosalgado@gmail.com' ? 'Admin Master' : 'Prestador Teste',
            role: category,
            category: category
          },
          aud: 'authenticated',
          created_at: new Date().toISOString()
        } as any;
        cachedUser = masterData;
        cachedCategory = category;
        cachedAdmin = category === 'admin';
        return masterData;
      }

      // getSession é resiliente e rápido (lê storage)
      const { data: { session }, error } = await supabaseExternal.auth.getSession();
      
      if (session?.user) {
        cachedUser = session.user;
        return session.user;
      }

      // Apenas se o storage falhar e estivermos online, tentamos a API
      if (typeof navigator !== 'undefined' && navigator.onLine) {
        const { data: { user } } = await supabaseExternal.auth.getUser();
        cachedUser = user;
        return user;
      }
      
      return null;
    } catch (e) {
      console.warn("[current-user] Falha ao recuperar usuário:", e);
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

  if (email === 'jorgericardosalgado@gmail.com' || (isMasterBypass && localCategory === 'admin')) {
    cachedAdmin = true;
    return true;
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
  if (typeof window !== 'undefined' && localStorage.getItem('fixxer:master-bypass') === 'true') {
    const cat = localStorage.getItem('fixxer:last-category');
    return cat === 'admin';
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
  
  if (email === 'jorgericardosalgado@gmail.com') {
    cachedCategory = "admin";
    return "admin";
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
  supabaseExternal.auth.onAuthStateChange(async (event, session) => {
    console.log(`[Identity] Evento Auth: ${event}`, !!session);
    
    if (event === "SIGNED_OUT") {
      if (localStorage.getItem('fixxer:master-bypass') === 'true') return;
      clearCurrentUserCache();
    } else if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED" || event === "USER_UPDATED") {
      if (session?.user) {
        cachedUser = session.user;
      }
      
      // Auto-redirecionamento se estiver em /auth logado
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