// =============================================================================
// Hook para ler/escrever os filtros de anúncio na URL da rota de feed.
// Cada feed passa seu próprio `from` (id de rota) para amarrar tipos.
// =============================================================================

import { useCallback } from "react";
import { getRouteApi, type RegisteredRouter } from "@tanstack/react-router";
import {
  coerceDistanceKey,
  coerceUrgencyKey,
  type AdDistanceKey,
  type AdFilterSearch,
  type AdUrgencyKey,
} from "@/lib/ad-filter-search";

type FeedRouteId =
  | "/_authenticated/feed/lojista"
  | "/_authenticated/feed/cliente"
  | "/_authenticated/feed/parceiro"
  | "/_authenticated/feed/prestador";

type Setters = {
  setUrgency: (v: AdUrgencyKey) => void;
  setDistance: (v: AdDistanceKey) => void;
  setTag: (v: string) => void;
  resetAll: () => void;
};

/**
 * Ancora o estado de urgência/raio/tag na URL. Persiste ao recarregar e ao
 * compartilhar. Escreve com `replace: true` para não empilhar histórico a
 * cada tecla no campo tag.
 */
export function useAdFilterSearchState(
  routeId: FeedRouteId,
): AdFilterSearch & Setters {
  const api = getRouteApi(routeId);
  const search = api.useSearch() as AdFilterSearch;
  // useNavigate atrelado à rota preserva tipagem de `search`.
  const navigate = api.useNavigate() as unknown as (opts: {
    search: (prev: AdFilterSearch) => Partial<AdFilterSearch>;
    replace?: boolean;
  }) => void;

  const patch = useCallback(
    (delta: Partial<AdFilterSearch>) => {
      navigate({ search: (prev) => ({ ...prev, ...delta }), replace: true });
    },
    [navigate],
  );

  return {
    urgency: coerceUrgencyKey(search.urgency),
    distance: coerceDistanceKey(search.distance),
    tag: search.tag ?? "",
    setUrgency: (v) => patch({ urgency: v }),
    setDistance: (v) => patch({ distance: v }),
    setTag: (v) => patch({ tag: v }),
    resetAll: () => patch({ urgency: "todos", distance: "todos", tag: "" }),
  };
}

// Re-exporta para não obrigar imports duplos nos consumidores.
export type { AdDistanceKey, AdUrgencyKey };
export type __RouterProbe = RegisteredRouter;
