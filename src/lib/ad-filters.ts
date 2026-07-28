// =============================================================================
// Filtros compartilhados para anúncios (urgência, raio, tags)
// Aplicáveis no cliente (mocks) e no servidor (Supabase query builder).
// =============================================================================

import type { UrgencyTag } from "@/components/AdMetaBadges";

export type AdFilters = {
  urgency?: "todos" | UrgencyTag;
  distance?: "todos" | number; // raio máximo em km
  tag?: string; // hashtag opcional (com ou sem #)
  term?: string; // termo textual
};

export type AdLike = {
  urgency_tag?: UrgencyTag | string | null;
  service_radius_km?: number | null;
  tags?: string[] | null;
  title?: string | null;
  description?: string | null;
  keywords?: string[] | null;
};

/**
 * Normaliza uma string de entrada em uma lista de tags.
 * - Aceita separação por vírgula ou espaço
 * - Remove `#` do início
 * - Remove caracteres especiais (mantém letras/números Unicode, `_` e `-`)
 * - Baixa a caixa
 * - Remove duplicatas mantendo a primeira ocorrência
 * - Limita a `max` (padrão 5)
 * - Retorna tokens sem o prefixo `#`
 */
export function normalizeAdTags(raw: string | string[] | null | undefined, max = 5): string[] {
  if (!raw) return [];
  const parts = Array.isArray(raw)
    ? raw
    : raw.split(/[,\s]+/g);
  const seen = new Set<string>();
  const out: string[] = [];
  for (const part of parts) {
    if (typeof part !== "string") continue;
    const cleaned = part
      .trim()
      .replace(/^#+/, "")
      .toLowerCase()
      .replace(/[^\p{L}\p{N}_-]+/gu, "")
      .slice(0, 24);
    if (!cleaned) continue;
    if (seen.has(cleaned)) continue;
    seen.add(cleaned);
    out.push(cleaned);
    if (out.length >= max) break;
  }
  return out;
}

/** Retorna a hashtag pronta para exibição (com `#`). */
export function formatTagLabel(tag: string): string {
  const t = tag.replace(/^#+/, "");
  return t ? `#${t}` : "";
}

/** Mapeia urgências customizadas (ex.: "critica") para os selos suportados. */
export function coerceUrgency(u: string | null | undefined): UrgencyTag | null {
  if (!u) return null;
  const v = u.toLowerCase();
  if (v === "urgente" || v === "critica" || v === "hoje") return "urgente";
  if (v === "encomenda" || v === "sob-encomenda" || v === "sob_encomenda") return "encomenda";
  if (v === "normal") return "normal";
  return null;
}

/** Predicado puro para filtrar itens no cliente (aplica os mesmos critérios do backend). */
export function matchesAdFilters(item: AdLike, filters: AdFilters): boolean {
  const u = filters.urgency;
  if (u && u !== "todos") {
    if (coerceUrgency(item.urgency_tag ?? null) !== u) return false;
  }
  const d = filters.distance;
  if (d !== undefined && d !== "todos") {
    const r = item.service_radius_km ?? 0;
    if (!(r > 0 && r <= d)) return false;
  }
  const tag = (filters.tag ?? "").trim().toLowerCase().replace(/^#/, "");
  if (tag) {
    const tags = (item.tags ?? []).map((t) => t.toLowerCase().replace(/^#/, ""));
    if (!tags.some((t) => t.includes(tag))) return false;
  }
  const term = (filters.term ?? "").trim().toLowerCase();
  if (term) {
    const hay = [
      item.title ?? "",
      item.description ?? "",
      ...(item.keywords ?? []),
      ...(item.tags ?? []),
    ]
      .join(" ")
      .toLowerCase();
    if (!hay.includes(term)) return false;
  }
  return true;
}

/**
 * Interface mínima do query builder do Supabase para aplicar filtros.
 * Uso: `applyAdFiltersToQuery(supabase.from("service_orders").select("*"), filters)`.
 */
export interface AdQueryBuilder {
  eq: (column: string, value: unknown) => AdQueryBuilder;
  lte: (column: string, value: unknown) => AdQueryBuilder;
  overlaps: (column: string, values: readonly unknown[]) => AdQueryBuilder;
  or: (filters: string) => AdQueryBuilder;
  ilike: (column: string, pattern: string) => AdQueryBuilder;
}

/**
 * Aplica os filtros de urgência, distância e tag diretamente na query do Supabase.
 * - urgência → `.eq("urgency_tag", u)`
 * - distância → `.lte("service_radius_km", d)` (raio máximo)
 * - tag → `.overlaps("tags", [tag])` (usa índice GIN)
 * - termo → `.or("title.ilike.%term%,description.ilike.%term%")`
 */
export function applyAdFiltersToQuery<Q extends AdQueryBuilder>(query: Q, filters: AdFilters): Q {
  let q = query;
  if (filters.urgency && filters.urgency !== "todos") {
    q = q.eq("urgency_tag", filters.urgency) as Q;
  }
  if (filters.distance !== undefined && filters.distance !== "todos") {
    q = q.lte("service_radius_km", filters.distance) as Q;
  }
  const tag = (filters.tag ?? "").trim().toLowerCase().replace(/^#/, "");
  if (tag) {
    q = q.overlaps("tags", [tag]) as Q;
  }
  const term = (filters.term ?? "").trim();
  if (term) {
    const safe = term.replace(/[%,()]/g, " ").trim();
    if (safe) {
      q = q.or(`title.ilike.%${safe}%,description.ilike.%${safe}%`) as Q;
    }
  }
  return q;
}
