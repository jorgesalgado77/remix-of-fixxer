// =============================================================================
// Hook para sincronizar em tempo real (incremental) os contadores
// 👁️ views e 💬 chats dos anúncios do dono, SEM recarregar a página.
//
// Estratégia:
//   1. Polling leve a cada `intervalMs` (padrão 20s) — barato, funciona offline-first.
//   2. Realtime opcional: assina UPDATEs de metadata em qualquer tabela candidata.
//      Se a tabela não existir/realtime desligado, o polling ainda cobre.
//   3. Só busca IDs remotos (ignora ids sintéticos `mock-`/`local-`).
//   4. Emite os deltas ao componente via callback `onMetrics`.
// =============================================================================

import { useEffect, useRef } from "react";
import { supabaseExternal } from "@/lib/supabaseExternal";

const AD_TABLES = ["posts", "ads", "feed_posts"] as const;

export type AdMetric = {
  id: string;
  views: number;
  chats: number;
};

export type UseAdMetricsLiveOptions = {
  /** IDs dos anúncios do dono. Sintéticos (mock/local) são ignorados. */
  adIds: string[];
  /** Callback chamado com o mapa de métricas atualizadas. */
  onMetrics: (metrics: Record<string, AdMetric>) => void;
  /** Intervalo do polling em ms. Default: 20000. Use 0 para desativar. */
  intervalMs?: number;
  /** Se true, também tenta abrir canal realtime (best-effort). Default: true. */
  realtime?: boolean;
  /** Habilita/desliga o hook (ex.: enquanto está carregando). */
  enabled?: boolean;
};

function isSyntheticId(id: string): boolean {
  return id.startsWith("mock-") || id.startsWith("local-");
}

async function fetchOnce(ids: string[]): Promise<Record<string, AdMetric>> {
  const remoteIds = ids.filter((id) => !isSyntheticId(id));
  if (remoteIds.length === 0) return {};
  const out: Record<string, AdMetric> = {};
  for (const table of AD_TABLES) {
    try {
      const { data, error } = await supabaseExternal
        .from(table)
        .select("id, metadata")
        .in("id", remoteIds);
      if (error || !data) continue;
      for (const row of data as Array<{ id: string; metadata: Record<string, unknown> | null }>) {
        const meta = (row.metadata ?? {}) as Record<string, unknown>;
        out[row.id] = {
          id: row.id,
          views: Number(meta.views ?? 0) || 0,
          chats: Number(meta.chats ?? 0) || 0,
        };
      }
      if (Object.keys(out).length > 0) break;
    } catch {
      /* tenta próxima tabela */
    }
  }
  return out;
}

export function useAdMetricsLive({
  adIds,
  onMetrics,
  intervalMs = 20_000,
  realtime = true,
  enabled = true,
}: UseAdMetricsLiveOptions): void {
  // Referências estáveis para evitar reinscrever a cada render.
  const cbRef = useRef(onMetrics);
  cbRef.current = onMetrics;
  const idsRef = useRef<string[]>(adIds);
  idsRef.current = adIds;

  // Chave que dispara reinscrição só quando a LISTA muda de fato.
  const idsKey = adIds
    .filter((id) => !isSyntheticId(id))
    .slice()
    .sort()
    .join(",");

  useEffect(() => {
    if (!enabled || !idsKey) return;
    let cancelled = false;

    const run = async () => {
      const ids = idsRef.current;
      const metrics = await fetchOnce(ids);
      if (!cancelled && Object.keys(metrics).length > 0) cbRef.current(metrics);
    };

    // Primeira leitura imediata (barato: 1 query com IN)
    run();

    const timer =
      intervalMs > 0
        ? window.setInterval(() => {
            // pausa quando a aba está em segundo plano — economia de bateria/rede
            if (document.visibilityState !== "visible") return;
            run();
          }, intervalMs)
        : null;

    // Realtime best-effort — se a tabela não estiver publicada em realtime,
    // simplesmente não recebe eventos; o polling cobre.
    const channels: Array<{ unsubscribe?: () => void } | undefined> = [];
    if (realtime) {
      const remoteIds = idsKey.split(",").filter(Boolean);
      for (const table of AD_TABLES) {
        try {
          const ch = supabaseExternal
            .channel(`ad_metrics:${table}`)
            .on(
              // supabase-js aceita a assinatura genérica; casts evitam ruído de tipos.
              "postgres_changes" as never,
              { event: "UPDATE", schema: "public", table } as never,
              (payload: { new?: { id?: string } | null }) => {
                const id = payload?.new?.id;
                if (id && remoteIds.includes(id)) run();
              },
            )
            .subscribe();
          channels.push(ch as unknown as { unsubscribe?: () => void });
        } catch {
          /* ignore */
        }
      }
    }

    // Refresca ao voltar para a aba (recupera atrasos do polling suspenso)
    const onVis = () => {
      if (document.visibilityState === "visible") run();
    };
    document.addEventListener("visibilitychange", onVis);

    return () => {
      cancelled = true;
      if (timer) window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVis);
      for (const ch of channels) {
        try {
          if (ch && typeof ch.unsubscribe === "function") ch.unsubscribe();
          else if (ch) supabaseExternal.removeChannel(ch as never);
        } catch {
          /* ignore */
        }
      }
    };
  }, [enabled, idsKey, intervalMs, realtime]);
}
