// =============================================================================
// URL search schema para filtros de anúncios (urgência / raio / tag).
// Compartilhado entre as rotas /_authenticated/feed/{lojista,cliente,parceiro,prestador}
// para que o estado dos filtros seja persistido na URL — sobrevive a
// recarregamento e é seguro para compartilhar.
// =============================================================================

import type { AdFilters } from "@/lib/ad-filters";
import type { UrgencyTag } from "@/components/AdMetaBadges";

export const AD_URGENCY_KEYS = ["todos", "urgente", "normal", "encomenda"] as const;
export const AD_DISTANCE_KEYS = ["todos", "5", "15", "30"] as const;

export type AdUrgencyKey = (typeof AD_URGENCY_KEYS)[number];
export type AdDistanceKey = (typeof AD_DISTANCE_KEYS)[number];

export type AdFilterSearch = {
  urgency: AdUrgencyKey;
  distance: AdDistanceKey;
  tag: string;
};

export function coerceUrgencyKey(raw: unknown): AdUrgencyKey {
  const v = typeof raw === "string" ? (raw.toLowerCase() as AdUrgencyKey) : "todos";
  return (AD_URGENCY_KEYS as readonly string[]).includes(v) ? v : "todos";
}

export function coerceDistanceKey(raw: unknown): AdDistanceKey {
  const v = typeof raw === "string" ? (raw.toLowerCase() as AdDistanceKey) : "todos";
  return (AD_DISTANCE_KEYS as readonly string[]).includes(v) ? v : "todos";
}

function coerceTag(raw: unknown): string {
  return typeof raw === "string" ? raw.trim() : "";
}

/**
 * Validator compatível com TanStack Router `validateSearch`. Valores inválidos
 * caem para o padrão em vez de lançar, garantindo que URLs compartilhadas
 * sempre resolvam.
 */
export function validateAdFilterSearch(raw: Record<string, unknown>): AdFilterSearch {
  return {
    urgency: coerceUrgencyKey(raw.urgency),
    distance: coerceDistanceKey(raw.distance),
    tag: coerceTag(raw.tag),
  };
}

/**
 * Converte o estado da URL para o formato consumido por `matchesAdFilters` e
 * `applyAdFiltersToQuery`.
 */
export function toAdFilters(
  raw: Partial<AdFilterSearch>,
  extra?: { term?: string },
): AdFilters {
  const urgency = coerceUrgencyKey(raw.urgency);
  const distanceKey = coerceDistanceKey(raw.distance);
  const distance = distanceKey === "todos" ? ("todos" as const) : Number(distanceKey);
  const tag = coerceTag(raw.tag);
  return {
    urgency: urgency as "todos" | UrgencyTag,
    distance,
    tag: tag || undefined,
    term: extra?.term,
  };
}
