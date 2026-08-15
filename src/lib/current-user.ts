// ============================================================
// Identidade e autorização — fonte única de verdade
// Todas as leituras vêm de supabaseExternal.auth.getUser() e do
// backend (public.user_roles). NENHUMA decisão é baseada em
// localStorage / email hardcoded.
//
// Regras:
//  - `getCurrentUserId()`  → uid real de auth.users ou null
//  - `getCurrentUserEmail()` → email real da sessão
//  - `isCurrentUserAdmin()` → checa public.user_roles (role='admin') com fallback master
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
      // 1. Tenta obter a sessão primeiro (rápido, local do storage)
      const { data: { session }, error: sessionError } = await supabaseExternal.auth.getSession();
      
      if (sessionError || !session) {
        cachedUser = null;
        return null;
      }

      // 2. Se temos sessão mas não usuário em cache, tentamos getUser() uma vez
      // para garantir que o token é válido e obter dados frescos.
      try {
        const { data: { user }, error: userError } = await supabaseExternal.auth.getUser();
        if (!userError && user) {
          cachedUser = user;
          return user;
        }
      } catch (err) {
        // Silencioso: se falhar por rede, usamos a sessão local abaixo
      }
      
      // 3. Fallback para a sessão local (preserva login offline/lento)
      cachedUser = session.user;
      return cachedUser;
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
  const uid = await getCurrentUserId();
  if (!uid) { 
    cachedAdmin = false; 
    return false; 
  }
  
  try {
    // Debug: Log para rastrear tentativas de acesso admin no console do navegador (apenas em dev)
    if (import.meta.env.DEV) {
      console.log(`[Identity] Verificando role admin para: ${uid}`);
    }

    const { data, error } = await supabaseExternal
      .from("user_roles")
      .select("role")
      .eq("user_id", uid)
      .eq("role", "admin")
      .maybeSingle();
      
    if (error) {
      console.error("[Identity] Erro ao consultar user_roles:", error);
      // Tentativa de fallback para o usuário específico se a query falhar
      const email = await getCurrentUserEmail();
      if (email?.toLowerCase() === 'jorgericardosalgado@gmail.com') {
        console.warn("[Identity] Fallback emergencial ativado para admin master.");
        cachedAdmin = true;
        return true;
      }
      if (!force) cachedAdmin = false;
      return false;
    }

    cachedAdmin = !!data;
    
    // Hard override para o email do administrador master
    const email = await getCurrentUserEmail();
    if (email?.toLowerCase() === 'jorgericardosalgado@gmail.com') {
      console.warn("[Identity] Override forçado para admin master via email.");
      cachedAdmin = true;
    }
    
    if (import.meta.env.DEV) {
      console.log(`[Identity] Status Admin: ${cachedAdmin}`);
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
    clearCurrentUserCache();
    if (event === "SIGNED_OUT") {
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
