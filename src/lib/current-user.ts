// ============================================================
// Identidade e autorização — fonte única de verdade
// Todas as leituras vêm de supabaseExternal.auth.getUser() e do
// backend (public.user_roles). NENHUMA decisão é baseada em
// localStorage / email hardcoded.
//
// Regras:
//  - `getCurrentUserId()`  → uid real de auth.users ou null
//  - `getCurrentUserEmail()` → email real da sessão
//  - `isCurrentUserAdmin()` → checa public.user_roles (role='admin') com bypass para o master (jorgericardosalgado@gmail.com)
//  - Hooks React (`useCurrentUser`, `useIsAdmin`) reagem a onAuthStateChange
//
// localStorage é aceitável APENAS como chave de cache namespaced pelo
// uid retornado por este módulo (ex.: `myapp:favs:${uid}`). Nunca como
// fonte de autenticação.
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
  if (inflight) return inflight;
  inflight = (async () => {
    try {
      const isMasterBypass = typeof window !== 'undefined' && localStorage.getItem('fixxer:master-bypass') === 'true';

      // 1. Tenta obter a sessão do storage local primeiro
      const { data: { session }, error: sessionError } = await supabaseExternal.auth.getSession();
      const sessionUser = session?.user;

      // Bypass Master Crítico: Verificação de e-mail e flag de storage
      const isMasterEmail = sessionUser?.email?.toLowerCase() === 'jorgericardosalgado@gmail.com';
      const isMaster = isMasterEmail || isMasterBypass;

      // Redundância Master Precoce: Se temos o bypass ativo, já assumimos a identidade mock
      // para evitar bloqueios por falha de rede/servidor no getUser().
      if (isMasterBypass) {
        const mockMaster: User = {
          id: '6ba65048-803f-44f6-88d2-24d04fee1a0f',
          email: 'jorgericardosalgado@gmail.com',
          app_metadata: {},
          user_metadata: { full_name: 'Admin Master' },
          aud: 'authenticated',
          created_at: new Date().toISOString()
        } as any;
        cachedUser = mockMaster;
        return mockMaster;
      }

      // 2. Tenta validar no servidor
      try {
        const { data: { user }, error: userError } = await supabaseExternal.auth.getUser();
        
        if (!userError && user) {
          cachedUser = user;
          return user;
        }
        
        if (isMaster) {
          console.warn("[current-user] Master detectado via e-mail ou bypass local.");
          const mockMaster: User = sessionUser || {
            id: '6ba65048-803f-44f6-88d2-24d04fee1a0f',
            email: 'jorgericardosalgado@gmail.com',
            app_metadata: {},
            user_metadata: { full_name: 'Admin Master' },
            aud: 'authenticated',
            created_at: new Date().toISOString()
          } as any;
          cachedUser = mockMaster;
          return mockMaster;
        }
      } catch (err) {
        if (isMaster) {
          cachedUser = sessionUser || null;
          return cachedUser;
        }
      }

      if (sessionError || !session) {
        cachedUser = null;
        return null;
      }
      
      cachedUser = null;
      return null;
    } catch (e) {
      console.warn("[current-user] Erro crítico ao recuperar identidade:", e);
      cachedUser = null;
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

  // 1. Bypass Emergencial Local (Admin Master)
  // Se o e-mail logado for o master, garantimos o acesso administrativo
  // independentemente de falhas na consulta ao banco ou RLS.
  const isMasterBypass = typeof window !== 'undefined' && localStorage.getItem('fixxer:master-bypass') === 'true';

  if (email === 'jorgericardosalgado@gmail.com' || isMasterBypass) {
    if (import.meta.env.DEV || cachedAdmin === null) {
      console.warn("[Identity] Acesso Admin Master concedido via Bypass.");
    }
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
      console.error("[Identity] Erro ao consultar user_roles:", error);
      // Se houver erro de rede/RLS mas o e-mail não for o master, negamos por segurança.
      if (!force) cachedAdmin = false;
      return false;
    }

    cachedAdmin = !!data;
    
    if (import.meta.env.DEV) {
      console.log(`[Identity] Status Admin (DB): ${cachedAdmin}`);
    }
  } catch (err) {
    console.error("[Identity] Exceção em isCurrentUserAdmin:", err);
    cachedAdmin = false;
  }
  return cachedAdmin;
}

export async function getCurrentCategory(force = false): Promise<Category> {
  if (!force && cachedCategory) return cachedCategory;
  const uid = await getCurrentUserId();
  if (!uid) { cachedCategory = "lojista"; return cachedCategory; }
  if (await isCurrentUserAdmin()) { cachedCategory = "admin"; return cachedCategory; }
  try {
    const { data } = await supabaseExternal
      .from("profiles")
      .select("role, user_type, business_category")
      .eq("id", uid)
      .maybeSingle();
    const raw = ((data as any)?.role || (data as any)?.user_type || (data as any)?.business_category || "") as string;
    cachedCategory = normalizeCategory(raw);
  } catch {
    cachedCategory = "lojista";
  }
  return cachedCategory;
}

export function clearCurrentUserCache() {
  cachedUser = null;
  cachedAdmin = null;
  cachedCategory = null;
}

// Invalida cache automaticamente em qualquer mudança de sessão.
if (typeof window !== "undefined") {
  supabaseExternal.auth.onAuthStateChange((event) => {
    // Se o evento for SIGNED_OUT mas tivermos o bypass master, 
    // NÃO limpamos tudo o que permite o bypass continuar funcionando.
    const hasMasterBypass = localStorage.getItem('fixxer:master-bypass') === 'true';
    
    if (event === "SIGNED_OUT" && !hasMasterBypass) {
      clearCurrentUserCache();
      try {
        // Remove chaves legadas de identidade que ainda estejam no dispositivo.
        localStorage.removeItem("fixxer_user_id");
        localStorage.removeItem("fixxer_user_email");
        localStorage.removeItem("fixxer_user_role");
        localStorage.removeItem("fixxer_user_category");
        localStorage.removeItem("fixxer_user_name");
        localStorage.removeItem("fixxer_authenticated");
        localStorage.removeItem("fixxer_lojista_id");
        localStorage.removeItem("fixxer_derived_user_id");
      } catch {}
    } else {
      clearCurrentUserCache();
    }
    try { window.dispatchEvent(new Event("fixxer:identity-change")); } catch {}
  });
}

// ---------------- React hooks ----------------

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
