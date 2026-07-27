/**
 * FIXXER — Núcleo puro da Busca Universal.
 * -----------------------------------------
 * Funções sem I/O usadas pela UI e pelos testes automatizados.
 *
 * • `stripAccents` — normalização case/accent-insensitive.
 * • `rowMatchesTerm` — casa termo (multi-palavra) em qualquer campo relevante.
 * • `getMatchedFields` — lista os campos que casaram (para destaque/UX).
 * • `scoreRow` — ranking de relevância multi-fator (nome > cargo > cidade …).
 * • `sortByRelevance` — ordena resultados usando `scoreRow`.
 * • `splitHighlight` — quebra uma string em segmentos {text, hit} para
 *   renderização segura (SEM dangerouslySetInnerHTML) do destaque no card.
 */

export type UserCategory = "prestador" | "lojista" | "fornecedor" | "cliente";

export const SEARCHED_FIELDS = [
  "full_name",
  "display_name",
  "company_name",
  "city",
  "state",
  "business_category",
  "custom_branch",
  "activity_branch",
  "specialty",
  "description",
  "role",
  "user_type",
  "categories",
  "preferred_service",
  "job_roles",
  "positions",
  "custom_sections",
] as const;

export type SearchableField = (typeof SEARCHED_FIELDS)[number];

/** Peso por campo no ranking de relevância (quanto maior, mais relevante). */
const FIELD_WEIGHTS: Record<SearchableField, number> = {
  // Cargo / função / papel — prioridade máxima para consultas como
  // "liberador", "conferente", "motorista", etc.
  job_roles: 14,
  positions: 14,
  preferred_service: 12,
  specialty: 12,
  role: 11,
  display_name: 10,
  full_name: 9,
  company_name: 9,
  business_category: 8,
  custom_branch: 8,
  activity_branch: 8,
  categories: 6,
  user_type: 5,
  description: 4,
  custom_sections: 4,
  city: 3,
  state: 2,
};

/** Campos considerados "cargo/papel" — recebem multiplicador extra no ranking. */
const ROLE_FIELDS: readonly SearchableField[] = [
  "job_roles",
  "positions",
  "preferred_service",
  "specialty",
  "role",
] as const;

/** Bônus por categoria — lojistas ficam levemente acima em empate,
 * pois costumam ser resultados mais "resolutivos" na busca (produtos/serviços). */
const CATEGORY_BONUS: Record<UserCategory, number> = {
  lojista: 3,
  prestador: 2,
  fornecedor: 1,
  cliente: 0,
};

/** Sinônimos leves para tolerância a variações comuns em pt-BR. Grupos
 * bidirecionais: qualquer token do grupo expande para todos os outros. */
const SYNONYM_GROUPS: string[][] = [
  ["moveis", "movel", "mobilia", "mobiliario", "marcenaria", "marceneiro"],
  ["barbearia", "barbeiro", "barber"],
  ["eletricista", "eletrico", "eletrica", "eletricidade", "eletro"],
  ["chaveiro", "chave", "chaves"],
  ["pintura", "pintor", "pintores"],
  ["montador", "montagem", "montadores", "monta"],
  ["conferente", "conferencia", "confer"],
  ["medidor", "medidores", "hidrometro", "hidrometros"],
  ["encanador", "encanamento", "hidraulico", "hidraulica"],
  ["pedreiro", "alvenaria", "construcao", "obra", "obras"],
  ["mecanico", "mecanica", "auto", "automotivo"],
  ["jardineiro", "jardinagem", "jardim", "paisagismo"],
  ["diarista", "faxina", "faxineira", "limpeza"],
  ["gesseiro", "gesso", "drywall"],
  ["marmoraria", "marmore", "granito", "marmorista"],
  ["serralheria", "serralheiro", "solda", "soldador"],
  ["vidraceiro", "vidracaria", "vidro", "vidros"],
  ["tapeceiro", "tapecaria", "estofado", "estofador"],
];
const SYNONYMS: Record<string, string[]> = (() => {
  const map: Record<string, string[]> = {};
  for (const group of SYNONYM_GROUPS) {
    for (const word of group) map[word] = group;
  }
  return map;
})();

/**
 * Reduz uma palavra à sua raiz aproximada removendo sufixos comuns em pt-BR
 * (dor, dora, eiro, eira, ista, agem, cao, mento, ura, ico, ica, ador, edor).
 * Não é um stemmer completo — só serve para tolerar variações morfológicas
 * na busca (ex.: "medidor" ↔ "medição", "montador" ↔ "montagem").
 */
export function stemPt(word: string): string {
  const w = stripAccents(word);
  if (w.length < 5) return w;
  const suffixes = [
    "adores", "edores", "idores", "adoras", "edoras", "idoras",
    "ismos", "istas", "mentos", "coes",
    "ador", "edor", "idor", "adora", "edora", "idora",
    "eiro", "eira", "eiros", "eiras",
    "ista", "agem", "mento", "cao", "ura", "ico", "ica",
    "oes", "aes", "ais",
    "ar", "er", "ir",
    "os", "as", "es", "s",
  ];
  for (const suf of suffixes) {
    if (w.length - suf.length >= 4 && w.endsWith(suf)) return w.slice(0, -suf.length);
  }
  return w;
}

/** Remove acentos, normaliza espaços/pontuação e caixa. */
export function stripAccents(s: unknown): string {
  return String(s ?? "")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9@._\-\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Expande o termo com sinônimos conhecidos + stems aproximados.
 *  Só emite tokens com pelo menos 4 caracteres para evitar que raízes muito
 *  curtas (ex.: "med", "medi") casem substrings alheias ao domínio
 *  ("comédia", "sob medida", "mídia"). */
export function expandSynonyms(term: string): string[] {
  const base = stripAccents(term);
  if (!base) return [];
  const tokens = new Set<string>([base]);
  for (const word of base.split(" ")) {
    if (!word) continue;
    tokens.add(word);
    const stem = stemPt(word);
    if (stem && stem.length >= 5) tokens.add(stem);
    const syn = SYNONYMS[word] ?? (stem.length >= 5 ? SYNONYMS[stem] : undefined);
    if (syn) syn.forEach((s) => {
      tokens.add(s);
      const st = stemPt(s);
      if (st && st.length >= 5) tokens.add(st);
    });
  }
  return Array.from(tokens).filter((t) => t.length >= 4);
}

/** Casa um token como palavra completa dentro do haystack (accent/case
 *  já normalizado). Evita que "medi" case "medida" ou "medicao". */
function matchesWholeWord(haystack: string, token: string): boolean {
  if (!token) return false;
  const escaped = token.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(^|[^a-z0-9])${escaped}([^a-z0-9]|$)`, "i").test(haystack);
}

function stringifyValue(value: unknown): string {
  if (value == null) return "";
  if (Array.isArray(value)) return value.map(stringifyValue).filter(Boolean).join(" ");
  if (typeof value === "object") {
    try {
      return Object.values(value as Record<string, unknown>)
        .map(stringifyValue)
        .filter(Boolean)
        .join(" ");
    } catch {
      return "";
    }
  }
  return String(value);
}

export function getSearchableValue(row: any, field: SearchableField): string {
  if (!row || typeof row !== "object") return "";
  if (field === "custom_sections") {
    const extras = row.custom_sections?.__extras ?? {};
    return stringifyValue({
      custom_sections: row.custom_sections,
      extras,
      vehicle_type: row.vehicle_type,
      vehicle_brand: row.vehicle_brand,
      vehicle_model: row.vehicle_model,
      work_modes: row.work_modes,
      preferred_services: row.preferred_services,
      offerings: row.offerings,
      specialties: row.specialties,
    });
  }
  if (field === "positions") {
    const arr: any[] = Array.isArray(row.positions) ? row.positions : [];
    return arr
      .map((p) =>
        typeof p === "string"
          ? p
          : [p?.title, p?.name, p?.role, p?.department, p?.branch]
              .filter(Boolean)
              .join(" "),
      )
      .filter(Boolean)
      .join(" ");
  }
  if (field === "job_roles") {
    // Pode vir como CSV "||", array ou string simples.
    const v = row.job_roles;
    if (Array.isArray(v)) return v.map(stringifyValue).join(" ");
    return String(v ?? "").split("||").join(" ");
  }
  return stringifyValue(row[field]);
}

/**
 * Verifica se a linha casa com o termo, tolerando acentos, caixa,
 * ordem de palavras e sinônimos comuns.
 */
export function rowMatchesTerm(row: any, rawTerm: string): boolean {
  const normalizedTerm = stripAccents(rawTerm);
  if (!normalizedTerm) return false;

  const haystack = stripAccents(
    SEARCHED_FIELDS.map((f) => getSearchableValue(row, f)).join(" "),
  );
  if (!haystack) return false;

  // 1) Match literal do termo inteiro.
  if (haystack.includes(normalizedTerm)) return true;

  // 2) Todas as palavras (>=2 chars) presentes em qualquer ordem.
  const words = normalizedTerm.split(" ").filter((w) => w.length >= 2);
  if (words.length > 0 && words.every((w) => haystack.includes(w))) return true;

  // 3) Sinônimo — casamento como PALAVRA COMPLETA para evitar substring alheia
  //    (ex.: "medi" não deve casar "medida" em "móveis sob medida").
  const synonyms = expandSynonyms(rawTerm).filter((s) => s !== normalizedTerm);
  return synonyms.some((s) => matchesWholeWord(haystack, s));
}

export function getMatchedFields(row: any, rawTerm: string): SearchableField[] {
  const normalizedTerm = stripAccents(rawTerm);
  if (!normalizedTerm) return [];
  const words = normalizedTerm.split(" ").filter((w) => w.length >= 2);
  const synonyms = expandSynonyms(rawTerm).filter((s) => s !== normalizedTerm);
  return SEARCHED_FIELDS.filter((field) => {
    const value = stripAccents(getSearchableValue(row, field));
    if (!value) return false;
    if (value.includes(normalizedTerm)) return true;
    if (words.length > 0 && words.every((w) => value.includes(w))) return true;
    return synonyms.some((s) => matchesWholeWord(value, s));
  });
}

/**
 * Calcula o score de relevância de uma linha para um termo.
 * Combina: peso do campo × tipo de match (literal > todas palavras > sinônimo)
 * + bônus por categoria + bônus por match no início do campo (prefix).
 */
export function scoreRow(row: any, rawTerm: string, category?: UserCategory | null): number {
  const normalizedTerm = stripAccents(rawTerm);
  if (!normalizedTerm) return 0;
  const words = normalizedTerm.split(" ").filter((w) => w.length >= 2);
  const synonyms = expandSynonyms(rawTerm);

  let score = 0;
  for (const field of SEARCHED_FIELDS) {
    const value = stripAccents(getSearchableValue(row, field));
    if (!value) continue;
    const w = FIELD_WEIGHTS[field] ?? 1;

    if (value === normalizedTerm) {
      score += w * 5; // match exato do campo inteiro
      continue;
    }
    if (value.startsWith(normalizedTerm)) {
      score += w * 3;
      continue;
    }
    if (value.includes(normalizedTerm)) {
      score += w * 2;
      continue;
    }
    if (words.length > 0 && words.every((word) => value.includes(word))) {
      score += w;
      continue;
    }
    if (synonyms.some((s) => s !== normalizedTerm && matchesWholeWord(value, s))) {
      score += Math.max(1, Math.floor(w / 2));
    }
  }

  if (category && CATEGORY_BONUS[category] != null) {
    score += CATEGORY_BONUS[category];
  }
  return score;
}

/** Ordena uma lista de linhas por relevância decrescente e desempata por nome. */
export function sortByRelevance<T extends { name?: string; category?: UserCategory | null }>(
  items: T[],
  rawTerm: string,
  getRaw: (item: T) => any = (i) => i,
): T[] {
  return [...items]
    .map((item, i) => ({
      item,
      i,
      score: scoreRow(getRaw(item), rawTerm, item.category ?? null),
    }))
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      const an = (a.item.name ?? "").toLowerCase();
      const bn = (b.item.name ?? "").toLowerCase();
      if (an < bn) return -1;
      if (an > bn) return 1;
      return a.i - b.i;
    })
    .map((x) => x.item);
}

/**
 * Segmenta uma string em pedaços {text, hit} para destacar TODAS as ocorrências
 * de qualquer palavra do termo (accent-insensitive), preservando os caracteres
 * originais (inclusive acentos). Retorna dados puros para a UI renderizar como
 * JSX/<mark> — nunca use dangerouslySetInnerHTML sobre o input do usuário.
 */
export function splitHighlight(
  text: string | null | undefined,
  rawTerm: string,
): Array<{ text: string; hit: boolean }> {
  const src = String(text ?? "");
  const nTerm = stripAccents(rawTerm);
  if (!src || !nTerm) return [{ text: src, hit: false }];

  // Constrói uma lista de tokens (termo inteiro + palavras).
  const tokens = Array.from(
    new Set(
      [nTerm, ...nTerm.split(" ")]
        .map((t) => t.trim())
        .filter((t) => t.length >= 2),
    ),
  ).sort((a, b) => b.length - a.length);
  if (tokens.length === 0) return [{ text: src, hit: false }];

  // Normaliza src caractere-a-caractere mantendo o índice original.
  // Usamos NFD por caractere para lidar com acentos compostos.
  const normChars: string[] = [];
  const origIdx: number[] = [];
  for (let i = 0; i < src.length; i++) {
    const ch = src[i]
      .normalize("NFD")
      .replace(/\p{Diacritic}/gu, "")
      .toLowerCase();
    if (!ch) continue;
    for (const c of ch) {
      normChars.push(c);
      origIdx.push(i);
    }
  }
  const norm = normChars.join("");

  const ranges: Array<[number, number]> = []; // em coords originais
  for (const token of tokens) {
    let from = 0;
    while (from <= norm.length - token.length) {
      const idx = norm.indexOf(token, from);
      if (idx === -1) break;
      const start = origIdx[idx];
      const endNormChar = idx + token.length - 1;
      const end = origIdx[endNormChar] + 1;
      ranges.push([start, end]);
      from = idx + token.length;
    }
  }
  if (ranges.length === 0) return [{ text: src, hit: false }];

  // Merge de intervalos sobrepostos.
  ranges.sort((a, b) => a[0] - b[0]);
  const merged: Array<[number, number]> = [];
  for (const r of ranges) {
    const last = merged[merged.length - 1];
    if (last && r[0] <= last[1]) last[1] = Math.max(last[1], r[1]);
    else merged.push([r[0], r[1]]);
  }

  const out: Array<{ text: string; hit: boolean }> = [];
  let cursor = 0;
  for (const [s, e] of merged) {
    if (s > cursor) out.push({ text: src.slice(cursor, s), hit: false });
    out.push({ text: src.slice(s, e), hit: true });
    cursor = e;
  }
  if (cursor < src.length) out.push({ text: src.slice(cursor), hit: false });
  return out;
}
