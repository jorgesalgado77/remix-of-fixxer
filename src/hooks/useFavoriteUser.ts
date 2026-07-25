import { useCallback, useEffect, useState } from "react";
import { supabaseExternal } from "@/lib/supabaseExternal";
import { toast } from "sonner";

/**
 * Hook de favoritos entre usuários.
 * Persiste em `public.favorite_users` (colunas: user_id, favorited_user_id).
 * - Silencioso quando o usuário não está logado (retorna estado neutro).
 * - Se a tabela ainda não existir no Supabase, cai em modo local (localStorage)
 *   para não travar a UI. O usuário deve rodar o SQL fornecido no chat.
 */
const LS_PREFIX = "fixxer_favorite_user_v1:";
const LS_COUNT_PREFIX = "fixxer_favorite_user_count_v1:";

export function useFavoriteUser(favoritedUserId: string | null | undefined) {
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [isFavorited, setIsFavorited] = useState(false);
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);
  const [count, setCount] = useState<number>(0);

  // Descobre usuário logado.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data } = await supabaseExternal.auth.getUser();
        if (!cancelled) setCurrentUserId(data?.user?.id ?? null);
      } catch {
        if (!cancelled) setCurrentUserId(null);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // Lê estado inicial (favorito do usuário logado + contador público).
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!favoritedUserId) { setReady(true); return; }
      const countLsKey = `${LS_COUNT_PREFIX}${favoritedUserId}`;

      // Contador público — não depende de login.
      try {
        const { count: total, error: countErr } = await supabaseExternal
          .from("favorite_users")
          .select("id", { count: "exact", head: true })
          .eq("favorited_user_id", favoritedUserId);
        if (!cancelled) {
          if (countErr) throw countErr;
          const n = typeof total === "number" ? total : 0;
          setCount(n);
          try { window.localStorage.setItem(countLsKey, String(n)); } catch { /* ignore */ }
        }
      } catch {
        // Fallback silencioso: usa último valor conhecido do localStorage.
        try {
          const raw = window.localStorage.getItem(countLsKey);
          const n = raw ? Math.max(0, parseInt(raw, 10) || 0) : 0;
          if (!cancelled) setCount(n);
        } catch { /* ignore */ }
      }

      // Estado do favorito do usuário logado.
      if (!currentUserId) { if (!cancelled) setReady(true); return; }
      const lsKey = `${LS_PREFIX}${currentUserId}:${favoritedUserId}`;
      try {
        const { data, error } = await supabaseExternal
          .from("favorite_users")
          .select("id")
          .eq("user_id", currentUserId)
          .eq("favorited_user_id", favoritedUserId)
          .maybeSingle();
        if (cancelled) return;
        if (error) throw error;
        setIsFavorited(!!data);
      } catch {
        try { setIsFavorited(window.localStorage.getItem(lsKey) === "1"); } catch { /* ignore */ }
      } finally {
        if (!cancelled) setReady(true);
      }
    })();
    return () => { cancelled = true; };
  }, [favoritedUserId, currentUserId]);

  const toggle = useCallback(async () => {
    if (!favoritedUserId) return;
    if (loading) return; // evita cliques duplicados
    if (!currentUserId) {
      toast.error("Faça login para favoritar profissionais.");
      return;
    }
    if (currentUserId === favoritedUserId) {
      toast.info("Você não pode favoritar o próprio perfil.");
      return;
    }
    const next = !isFavorited;
    setIsFavorited(next); // otimista
    setCount((c) => Math.max(0, c + (next ? 1 : -1))); // otimista
    setLoading(true);
    const lsKey = `${LS_PREFIX}${currentUserId}:${favoritedUserId}`;
    const countLsKey = `${LS_COUNT_PREFIX}${favoritedUserId}`;
    try {
      if (next) {
        const { error } = await supabaseExternal
          .from("favorite_users")
          .insert({ user_id: currentUserId, favorited_user_id: favoritedUserId });
        if (error && !/duplicate|unique/i.test(error.message)) throw error;
        try { window.localStorage.setItem(lsKey, "1"); } catch { /* ignore */ }
        toast.success("Profissional adicionado aos seus Favoritos!");
      } else {
        const { error } = await supabaseExternal
          .from("favorite_users")
          .delete()
          .eq("user_id", currentUserId)
          .eq("favorited_user_id", favoritedUserId);
        if (error) throw error;
        try { window.localStorage.removeItem(lsKey); } catch { /* ignore */ }
        toast("Removido dos Favoritos.");
      }
      // Re-sincroniza contador com o servidor (silencioso).
      try {
        const { count: total } = await supabaseExternal
          .from("favorite_users")
          .select("id", { count: "exact", head: true })
          .eq("favorited_user_id", favoritedUserId);
        if (typeof total === "number") {
          setCount(total);
          try { window.localStorage.setItem(countLsKey, String(total)); } catch { /* ignore */ }
        }
      } catch { /* ignore — mantém valor otimista */ }
    } catch (err: any) {
      // Persistência local silenciosa (tabela ausente / RLS / rede).
      try {
        if (next) window.localStorage.setItem(lsKey, "1");
        else window.localStorage.removeItem(lsKey);
      } catch { /* ignore */ }
      try {
        const raw = window.localStorage.getItem(countLsKey);
        const n = raw ? Math.max(0, parseInt(raw, 10) || 0) : 0;
        const updated = Math.max(0, n + (next ? 1 : -1));
        window.localStorage.setItem(countLsKey, String(updated));
      } catch { /* ignore */ }
      toast(next ? "Favorito salvo localmente." : "Removido localmente.", {
        description: "Sincronizaremos automaticamente quando a conexão estiver disponível.",
      });
      if (typeof console !== "undefined") console.debug("[useFavoriteUser] fallback local:", err);
    } finally {
      setLoading(false);
    }
  }, [currentUserId, favoritedUserId, isFavorited, loading]);

  return {
    isFavorited,
    toggle,
    loading,
    ready,
    count,
    isSelf: !!currentUserId && currentUserId === favoritedUserId,
    isLoggedIn: !!currentUserId,
  };
}
