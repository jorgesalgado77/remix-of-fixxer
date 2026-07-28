// =============================================================================
// URL search schema para filtros de anúncios (urgência / raio / tag).
// Compartilhado entre as rotas /_authenticated/feed/{lojista,cliente,parceiro,prestador}
// para que o estado dos filtros seja persistido na URL — sobrevive a
// recarregamento e é seguro para compartilhar.
// =============================================================================

import { fallback } from "@tanstack/zod-adapter";
import { z } from "zod";
import type { AdFilters } from "@/lib/ad-filters";
import type { UrgencyTag } from "@/components/AdMetaBadges";

export const AD_URGENCY_KEYS = ["todos", "urgente", "normal", "encomenda"] as const;
export const AD_DISTANCE_KEYS = ["todos", "5", "15", "30"] as const;

export type AdUrgencyKey = (typeof AD_URGENCY_KEYS)[number];
export type AdDistanceKey = (typeof AD_DISTANCE_KEYS)[number];

/**
 * Schema Zod compatível com TanStack Router `validateSearch`. Não usamos
 * `z.enum(...)` fechado no schema (para respeitar as regras de search-params:
 * um valor inválido deve cair no fallback padrão em vez de resetar
 * silenciosamente). Fazemos a coerção depois com `coerce*`.
 */
export const adFilterSearchSchema = z.object({
  urgency: fallback(z.string(), "todos").default("todos"),
  distance: fallback(z.string(), "todos").default("todos"),
  tag: fallback(z.string(), "").default(""),
});

export type AdFilterSearch = z.infer<typeof adFilterSearchSchema>;

export function coerceUrgencyKey(raw: string | undefined | null): AdUrgencyKey {
  const v = (raw ?? "").toLowerCase() as AdUrgencyKey;
  return (AD_URGENCY_KEYS as readonly string[]).includes(v) ? v : "todos";
}

export function coerceDistanceKey(raw: string | undefined | null): AdDistanceKey {
  const v = (raw ?? "").toLowerCase() as AdDistanceKey;
  return (AD_DISTANCE_KEYS as readonly string[]).includes(v) ? v : "todos";
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
  const tag = (raw.tag ?? "").trim();
  return {
    urgency: urgency as "todos" | UrgencyTag,
    distance,
    tag: tag || undefined,
    term: extra?.term,
  };
}

/**
 * Serializa os filtros como delta para `navigate({ search })`, omitindo os
 * valores padrão para deixar a URL limpa (`/feed/lojista` em vez de
 * `/feed/lojista?urgency=todos&distance=todos&tag=`).
 */
export function serializeAdFilterSearch(next: Partial<AdFilterSearch>): AdFilterSearch {
  return {
    urgency: coerceUrgencyKey(next.urgency),
    distance: coerceDistanceKey(next.distance),
    tag: (next.tag ?? "").trim(),
  };
}
