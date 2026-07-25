import { useCallback, useEffect, useState } from "react";
import { spendCoinsForAction, getActionCost } from "@/lib/monetization";
import { supabaseExternal } from "@/lib/supabaseExternal";

/**
 * Gerencia o desbloqueio de "Oportunidades" no Feed (5 moedas por card).
 * - Persiste IDs desbloqueados em localStorage, por usuário.
 * - Realtime friendly: expõe `isUnlocked(id)` reativo via re-render.
 * - Idempotência: mesma OS não é debitada duas vezes na mesma janela.
 */
const LS_PREFIX = "fixxer_unlocked_posts_v1:";

export function usePostUnlock() {
  const [userId, setUserId] = useState<string | null>(null);
  const [unlocked, setUnlocked] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState<string | null>(null);

  // Descobre user atual e carrega set do localStorage.
  useEffect(() => {
    let mounted = true;
    supabaseExternal.auth.getUser().then(({ data }) => {
      const uid = data?.user?.id ?? null;
      if (!mounted) return;
      setUserId(uid);
      if (typeof window !== "undefined" && uid) {
        try {
          const raw = window.localStorage.getItem(LS_PREFIX + uid);
          if (raw) setUnlocked(new Set(JSON.parse(raw)));
        } catch {
          /* ignore */
        }
      }
    });
    return () => {
      mounted = false;
    };
  }, []);

  const persist = useCallback(
    (next: Set<string>) => {
      if (typeof window === "undefined" || !userId) return;
      try {
        window.localStorage.setItem(LS_PREFIX + userId, JSON.stringify([...next]));
      } catch {
        /* ignore */
      }
    },
    [userId],
  );

  const isUnlocked = useCallback((id: string) => unlocked.has(id), [unlocked]);

  /** Executa a cobrança de 5 moedas e marca o post como desbloqueado. */
  const unlock = useCallback(
    async (id: string): Promise<boolean> => {
      if (!id) return false;
      if (unlocked.has(id)) return true;
      if (!userId) {
        if (typeof window !== "undefined") {
          window.dispatchEvent(
            new CustomEvent("fixxer:toast", {
              detail: { type: "error", message: "Faça login para desbloquear." },
            }),
          );
        }
        return false;
      }
      setBusy(id);
      try {
        const res = await spendCoinsForAction(userId, "unlock_request", id, {
          idempotencyKey: `unlock_request:${id}`,
        });
        if (!res.ok) return false;
        setUnlocked((prev) => {
          const next = new Set(prev);
          next.add(id);
          persist(next);
          return next;
        });
        return true;
      } finally {
        setBusy(null);
      }
    },
    [unlocked, userId, persist],
  );

  const cost = getActionCost("unlock_request")?.coins ?? 5;

  return { userId, isUnlocked, unlock, busy, cost };
}
