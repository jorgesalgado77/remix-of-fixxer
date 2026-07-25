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

  // Lê estado inicial.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!favoritedUserId || !currentUserId) { setReady(true); return; }
      // Fallback local (usado se a tabela não existir).
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
        // Tabela ausente ou erro de rede → estado do localStorage.
        try { setIsFavorited(window.localStorage.getItem(lsKey) === "1"); } catch { /* ignore */ }
      } finally {
        if (!cancelled) setReady(true);
      }
    })();
    return () => { cancelled = true; };
  }, [favoritedUserId, currentUserId]);

  const toggle = useCallback(async () => {
    if (!favoritedUserId) return;
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
    setLoading(true);
    const lsKey = `${LS_PREFIX}${currentUserId}:${favoritedUserId}`;
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
    } catch (err: any) {
      // Persistência local silenciosa quando a tabela não existir ainda.
      try {
        if (next) window.localStorage.setItem(lsKey, "1");
        else window.localStorage.removeItem(lsKey);
      } catch { /* ignore */ }
      toast(next ? "Favorito salvo localmente." : "Removido localmente.", {
        description: "Configure a tabela favorite_users no Supabase para sincronizar entre dispositivos.",
      });
      if (typeof console !== "undefined") console.debug("[useFavoriteUser] fallback local:", err);
    } finally {
      setLoading(false);
    }
  }, [currentUserId, favoritedUserId, isFavorited]);

  return { isFavorited, toggle, loading, ready, isSelf: !!currentUserId && currentUserId === favoritedUserId, isLoggedIn: !!currentUserId };
}
