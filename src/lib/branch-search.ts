/**
 * Fuzzy search helpers para o seletor de Ramo Principal.
 * Extraído em módulo próprio para permitir testes unitários.
 */

export function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^a-z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Retorna a primeira categoria/subcategoria oficial semelhante ao termo
 * digitado pelo usuário, ou `null` quando não houver match razoável.
 *
 * Estratégia:
 *   1. Match direto (`includes` bidirecional).
 *   2. Match por palavras-chave (>=2 em comum, ou 1 palavra com length >= 4).
 *
 * Requer termo com pelo menos 3 caracteres normalizados.
 */
export function findSimilar(query: string, all: string[]): string | null {
  const q = normalize(query);
  if (q.length < 3) return null;

  const includeHit = all.find((l) => {
    const low = normalize(l);
    if (low === q) return false;
    return low.includes(q) || q.includes(low);
  });
  if (includeHit) return includeHit;

  const words = q.split(" ").filter((w) => w.length >= 3);
  if (words.length === 0) return null;

  return (
    all.find((l) => {
      const low = normalize(l);
      const matched = words.filter((w) => low.includes(w));
      return (
        matched.length >= Math.min(2, words.length) ||
        matched.some((w) => w.length >= 4 && low.includes(w))
      );
    }) || null
  );
}

export const ALLOWED_RADII_KM = [10, 25, 50, 100] as const;
export type AllowedRadiusKm = (typeof ALLOWED_RADII_KM)[number];

export function isAllowedRadius(v: unknown): v is AllowedRadiusKm {
  return typeof v === "number" && (ALLOWED_RADII_KM as readonly number[]).includes(v);
}

export const BIO_MAX_LENGTH = 1200;
