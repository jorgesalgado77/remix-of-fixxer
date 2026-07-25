import { useCallback, useEffect, useState } from "react";
import { spendCoinsForAction, getActionCost } from "@/lib/monetization";
import { supabaseExternal } from "@/lib/supabaseExternal";

/**
 * Desbloqueio VITALÍCIO de "Oportunidades" (5 moedas por card).
 * - Fonte de verdade: tabela `unlocked_posts (user_id, post_id, created_at)`.
 * - Fallback offline: localStorage por usuário.
 * - Pagamento único: uma vez debitado, o post abre de graça para sempre.
 * - Idempotência: mesma OS não é debitada duas vezes em janelas de retry.
 *
 * SQL sugerido (idempotente):
 *   create table if not exists public.unlocked_posts (
 *     user_id uuid not null references auth.users(id) on delete cascade,
 *     post_id text not null,
 *     created_at timestamptz not null default now(),
 *     primary key (user_id, post_id)
 *   );
 *   alter table public.unlocked_posts enable row level security;
 *   create policy "own_unlocks_select" on public.unlocked_posts
 *     for select to authenticated using (auth.uid() = user_id);
 *   create policy "own_unlocks_insert" on public.unlocked_posts
 *     for insert to authenticated with check (auth.uid() = user_id);
 */
const LS_PREFIX = "fixxer_unlocked_posts_v1:";
const TABLE = "unlocked_posts";

export function usePostUnlock() {
  const [userId, setUserId] = useState<string | null>(null);
  const [unlocked, setUnlocked] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState<string | null>(null);

  // Descobre user + carrega desbloqueios (Supabase primeiro, LS como fallback).
  useEffect(() => {
    let mounted = true;
    (async () => {
      const { data } = await supabaseExternal.auth.getUser();
      const uid = data?.user?.id ?? null;
      if (!mounted) return;
      setUserId(uid);
      if (!uid) return;

      // Fallback local imediato
      let localSet: Set<string> = new Set();
      if (typeof window !== "undefined") {
        try {
          const raw = window.localStorage.getItem(LS_PREFIX + uid);
          if (raw) localSet = new Set(JSON.parse(raw));
        } catch {
          /* ignore */
        }
      }
      if (mounted && localSet.size) setUnlocked(new Set(localSet));

      // Sincroniza com o servidor
      try {
        const { data: rows, error } = await supabaseExternal
          .from(TABLE)
          .select("post_id")
          .eq("user_id", uid);
        if (!error && rows && mounted) {
          const merged = new Set<string>(localSet);
          rows.forEach((r: any) => r?.post_id && merged.add(String(r.post_id)));
          setUnlocked(merged);
          try {
            window.localStorage.setItem(LS_PREFIX + uid, JSON.stringify([...merged]));
          } catch {
            /* ignore */
          }
        }
      } catch {
        /* rede indisponível → usa LS */
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const persistLocal = useCallback(
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

  const persistRemote = useCallback(
    async (postId: string) => {
      if (!userId) return;
      try {
        await supabaseExternal
          .from(TABLE)
          .upsert(
            { user_id: userId, post_id: postId },
            { onConflict: "user_id,post_id", ignoreDuplicates: true },
          );
      } catch {
        /* silencioso — LS mantém estado até próxima sincronização */
      }
    },
    [userId],
  );

  const isUnlocked = useCallback((id: string) => unlocked.has(id), [unlocked]);

  /** Verifica desbloqueio prévio e, se necessário, debita 5 moedas. */
  const unlock = useCallback(
    async (id: string): Promise<boolean> => {
      if (!id) return false;
      // Pagamento único: se já foi desbloqueado, abre de graça
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

      // Double-check remoto — evita cobrar se outro dispositivo já pagou
      try {
        const { data: row } = await supabaseExternal
          .from(TABLE)
          .select("post_id")
          .eq("user_id", userId)
          .eq("post_id", id)
          .maybeSingle();
        if (row?.post_id) {
          setUnlocked((prev) => {
            const next = new Set(prev);
            next.add(id);
            persistLocal(next);
            return next;
          });
          return true;
        }
      } catch {
        /* segue para cobrança */
      }

      setBusy(id);
      try {
        const res = await spendCoinsForAction(userId, "unlock_request", id, {
          idempotencyKey: `unlock_request:${id}`,
        });
        if (!res.ok) return false;
        await persistRemote(id);
        setUnlocked((prev) => {
          const next = new Set(prev);
          next.add(id);
          persistLocal(next);
          return next;
        });
        return true;
      } finally {
        setBusy(null);
      }
    },
    [unlocked, userId, persistLocal, persistRemote],
  );

  const cost = getActionCost("unlock_request")?.coins ?? 5;

  return { userId, isUnlocked, unlock, busy, cost };
}
