import { useCallback, useEffect, useRef, useState } from "react";
import { supabaseExternal } from "@/lib/supabaseExternal";
import { toast } from "sonner";

/**
 * Hook de favoritos entre usuários.
 * Persiste em `public.favorite_users` (colunas: user_id, favorited_user_id).
 * - Silencioso quando o usuário não está logado (retorna estado neutro).
 * - Se a tabela ainda não existir no Supabase, cai em modo local (localStorage)
 *   para não travar a UI. O usuário deve rodar o SQL fornecido no chat.
 * - Hidrata estado inicial de cache local (síncrono) para evitar flicker ao
 *   voltar para a página pública.
 * - Assina Realtime em `favorite_users` para manter o contador ao vivo.
 */
const LS_PREFIX = "fixxer_favorite_user_v1:";      // <currentUserId>:<favoritedUserId>
const LS_COUNT_PREFIX = "fixxer_favorite_user_count_v1:"; // agregado público por alvo
const LS_CURRENT_USER = "fixxer_favorite_current_user_v1";

function readCachedCurrentUser(): string | null {
  try {
    return window.localStorage.getItem("fixxer_user_id") || window.localStorage.getItem(LS_CURRENT_USER);
  } catch { return null; }
}
function readCachedCount(id: string | null | undefined): number {
  if (!id) return 0;
  try {
    const raw = window.localStorage.getItem(`${LS_COUNT_PREFIX}${id}`);
    return raw ? Math.max(0, parseInt(raw, 10) || 0) : 0;
  } catch { return 0; }
}
function composeKey(currentId: string | null | undefined, favId: string | null | undefined): string | null {
  if (!currentId || !favId) return null;
  return `${LS_PREFIX}${currentId}:${favId}`;
}
function readCachedFavorited(currentId: string | null, favId: string | null | undefined): boolean {
  const key = composeKey(currentId, favId);
  if (!key) return false;
  try { return window.localStorage.getItem(key) === "1"; } catch { return false; }
}
/**
 * Ao trocar de conta no mesmo navegador, removemos chaves de favorito escritas
 * por qualquer *outro* usuário. Assim evitamos que a nova sessão "herde" o
 * estado de favoritos do usuário anterior enquanto o Supabase ainda sincroniza.
 */
function purgeForeignFavoriteKeys(currentId: string | null | undefined) {
  if (typeof window === "undefined" || !currentId) return;
  try {
    const toRemove: string[] = [];
    for (let i = 0; i < window.localStorage.length; i++) {
      const k = window.localStorage.key(i);
      if (!k || !k.startsWith(LS_PREFIX)) continue;
      // formato esperado: fixxer_favorite_user_v1:<currentUserId>:<favoritedUserId>
      const rest = k.slice(LS_PREFIX.length);
      const owner = rest.split(":")[0];
      if (owner && owner !== currentId) toRemove.push(k);
    }
    toRemove.forEach((k) => window.localStorage.removeItem(k));
  } catch { /* ignore */ }
}

export function useFavoriteUser(favoritedUserId: string | null | undefined) {
  // Hidratação síncrona a partir do cache local — evita flicker.
  const initialUserId = typeof window !== "undefined" ? readCachedCurrentUser() : null;
  const [currentUserId, setCurrentUserId] = useState<string | null>(initialUserId);
  const [isFavorited, setIsFavorited] = useState<boolean>(() =>
    typeof window !== "undefined" ? readCachedFavorited(initialUserId, favoritedUserId) : false,
  );
  const [count, setCount] = useState<number>(() =>
    typeof window !== "undefined" ? readCachedCount(favoritedUserId) : 0,
  );
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState<boolean>(false);
  const inFlightToggle = useRef(false);

  // Descobre usuário logado (silencioso).
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data } = await supabaseExternal.auth.getUser();
        const cachedUid = typeof window !== "undefined" ? window.localStorage.getItem("fixxer_user_id") : null;
        const uid = data?.user?.id ?? cachedUid ?? null;
        if (cancelled) return;
        setCurrentUserId(uid);
        try {
          if (uid) window.localStorage.setItem(LS_CURRENT_USER, uid);
          else window.localStorage.removeItem(LS_CURRENT_USER);
        } catch { /* ignore */ }
      } catch {
        const cachedUid = typeof window !== "undefined" ? window.localStorage.getItem("fixxer_user_id") : null;
        if (!cancelled) setCurrentUserId(cachedUid ?? null);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // Re-hidrata cache quando muda o alvo (usuário navegou entre perfis).
  useEffect(() => {
    if (!favoritedUserId) return;
    setCount(readCachedCount(favoritedUserId));
    setIsFavorited(readCachedFavorited(currentUserId, favoritedUserId));
  }, [favoritedUserId, currentUserId]);

  // Sincroniza com servidor + assina Realtime para contador ao vivo.
  useEffect(() => {
    let cancelled = false;
    if (!favoritedUserId) { setReady(true); return; }
    const countLsKey = `${LS_COUNT_PREFIX}${favoritedUserId}`;

    const syncCount = async () => {
      try {
        const { count: total, error } = await supabaseExternal
          .from("favorite_users")
          .select("id", { count: "exact", head: true })
          .eq("favorited_user_id", favoritedUserId);
        if (cancelled) return;
        if (error) throw error;
        const n = typeof total === "number" ? total : 0;
        setCount(n);
        try { window.localStorage.setItem(countLsKey, String(n)); } catch { /* ignore */ }
      } catch {
        // silencioso — mantém cache local
      }
    };

    (async () => {
      await syncCount();
      if (currentUserId) {
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
          const fav = !!data;
          setIsFavorited(fav);
          try {
            if (fav) window.localStorage.setItem(lsKey, "1");
            else window.localStorage.removeItem(lsKey);
          } catch { /* ignore */ }
        } catch {
          // mantém cache local
        }
      }
      if (!cancelled) setReady(true);
    })();

    // Realtime silencioso — se falhar (RLS/permissão/tabela ausente), ignora.
    let channel: ReturnType<typeof supabaseExternal.channel> | null = null;
    try {
      channel = supabaseExternal
        .channel(`fav-users-${favoritedUserId}`)
        .on(
          "postgres_changes" as any,
          { event: "*", schema: "public", table: "favorite_users", filter: `favorited_user_id=eq.${favoritedUserId}` },
          () => { syncCount(); },
        )
        .subscribe();
    } catch { /* ignore */ }

    return () => {
      cancelled = true;
      try { if (channel) supabaseExternal.removeChannel(channel); } catch { /* ignore */ }
    };
  }, [favoritedUserId, currentUserId]);

  const toggle = useCallback(async () => {
    if (!favoritedUserId) return;
    if (loading || inFlightToggle.current) return;
    if (!currentUserId) {
      toast.error("Faça login para favoritar profissionais.");
      return;
    }
    if (currentUserId === favoritedUserId) {
      toast.info("Você não pode favoritar o próprio perfil.");
      return;
    }
    inFlightToggle.current = true;
    const next = !isFavorited;
    setIsFavorited(next); // otimista
    setCount((c) => Math.max(0, c + (next ? 1 : -1))); // otimista imediato
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
      // Re-sincroniza contador (silencioso). Realtime cobre demais clientes.
      try {
        const { count: total } = await supabaseExternal
          .from("favorite_users")
          .select("id", { count: "exact", head: true })
          .eq("favorited_user_id", favoritedUserId);
        if (typeof total === "number") {
          setCount(total);
          try { window.localStorage.setItem(countLsKey, String(total)); } catch { /* ignore */ }
        }
      } catch { /* ignore */ }
    } catch (err: any) {
      // Persistência local silenciosa (tabela ausente / RLS / rede).
      try {
        if (next) window.localStorage.setItem(lsKey, "1");
        else window.localStorage.removeItem(lsKey);
      } catch { /* ignore */ }
      try {
        const raw = window.localStorage.getItem(countLsKey);
        const n = raw ? Math.max(0, parseInt(raw, 10) || 0) : 0;
        window.localStorage.setItem(countLsKey, String(Math.max(0, n + (next ? 1 : -1))));
      } catch { /* ignore */ }
      toast(next ? "Favorito salvo localmente." : "Removido localmente.", {
        description: "Sincronizaremos automaticamente quando a conexão estiver disponível.",
      });
      if (typeof console !== "undefined") console.debug("[useFavoriteUser] fallback local:", err);
    } finally {
      setLoading(false);
      inFlightToggle.current = false;
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
