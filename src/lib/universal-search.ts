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
  ["conferente", "conferencia", "confer", "conferir"],
  ["medidor", "medidores", "hidrometro", "hidrometros", "medicao"],
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
  ["liberador", "liberadores", "liberadora", "liberacao", "liberar", "libera", "liberado"],
  ["motorista", "motoristas", "condutor", "conducao", "chofer"],
  ["ajudante", "ajudantes", "auxiliar", "auxiliares", "assistente"],
  ["entregador", "entregadores", "entrega", "entregas", "delivery", "motoboy"],
  ["operador", "operadores", "operadora", "operacao", "operar"],
  ["tecnico", "tecnica", "tecnicos", "tecnicas"],
  ["porteiro", "porteiros", "portaria", "vigilante", "vigia", "seguranca"],
  ["cozinheiro", "cozinheira", "cozinha", "chef", "chefe"],
  ["garcom", "garconete", "atendente", "atendimento"],
  ["carreteiro", "caminhoneiro", "carreta", "caminhao", "guincho"],
  ["soldador", "soldagem", "solda"],
  ["parceiro", "fornecedor", "b2b", "supplier", "distribuidor", "atacado"],
  ["prestador", "servico", "tecnico", "profissional", "autonomo", "freelance"],
  ["lojista", "loja", "comercio", "estabelecimento", "venda", "balcao"],
];
const SYNONYMS: Record<string, string[]> = (() => {
  const map: Record<string, string[]> = {};
  for (const group of SYNONYM_GROUPS) {
    for (const word of group) map[word] = group;
  }
  return map;
})();

/** Distância de Levenshtein (edit distance) entre duas strings normalizadas. */
export function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  const al = a.length, bl = b.length;
  if (al === 0) return bl;
  if (bl === 0) return al;
  let prev = new Array<number>(bl + 1);
  let cur = new Array<number>(bl + 1);
  for (let j = 0; j <= bl; j++) prev[j] = j;
  for (let i = 1; i <= al; i++) {
    cur[0] = i;
    for (let j = 1; j <= bl; j++) {
      const cost = a.charCodeAt(i - 1) === b.charCodeAt(j - 1) ? 0 : 1;
      cur[j] = Math.min(
        cur[j - 1] + 1,          // insert
        prev[j] + 1,             // delete
        prev[j - 1] + cost,      // substitute
      );
      // Damerau — transposição adjacente (ex.: "liebrador" ↔ "liberador").
      if (i > 1 && j > 1 &&
          a.charCodeAt(i - 1) === b.charCodeAt(j - 2) &&
          a.charCodeAt(i - 2) === b.charCodeAt(j - 1)) {
        cur[j] = Math.min(cur[j], prev[j - 2] !== undefined ? prev[j - 2] + 1 : cur[j]);
      }
    }
    const tmp = prev; prev = cur; cur = tmp;
  }
  return prev[bl];
}

/** Tolerância de edição em função do tamanho do token. */
function fuzzyTolerance(len: number): number {
  if (len <= 3) return 0;
  if (len <= 5) return 1;
  if (len <= 8) return 2;
  return 2;
}

/** Retorna true se alguma palavra do haystack estiver a ≤ N edições do token. */
export function fuzzyMatchesWord(haystack: string, token: string): boolean {
  if (!token || token.length < 4) return false;
  const tol = fuzzyTolerance(token.length);
  if (tol === 0) return matchesWholeWord(haystack, token);
  const words = haystack.split(/[^a-z0-9]+/i).filter(Boolean);
  for (const w of words) {
    if (Math.abs(w.length - token.length) > tol) continue;
    if (levenshtein(w, token) <= tol) return true;
    // Tolera token como prefixo aproximado de palavra maior (ex.: "libera" → "liberador").
    if (w.length > token.length && levenshtein(w.slice(0, token.length), token) <= tol) return true;
  }
  return false;
}


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
const STRIP_CACHE = new Map<string, string>();
const STRIP_CACHE_MAX = 2000;
export function stripAccents(s: unknown): string {
  const raw = String(s ?? "");
  if (raw.length === 0) return "";
  if (raw.length <= 128) {
    const cached = STRIP_CACHE.get(raw);
    if (cached !== undefined) return cached;
  }
  const out = raw
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9@._\-\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (raw.length <= 128) {
    if (STRIP_CACHE.size >= STRIP_CACHE_MAX) STRIP_CACHE.clear();
    STRIP_CACHE.set(raw, out);
  }
  return out;
}

/** Expande o termo com sinônimos conhecidos + stems aproximados.
 *  Só emite tokens com pelo menos 4 caracteres para evitar que raízes muito
 *  curtas (ex.: "med", "medi") casem substrings alheias ao domínio
 *  ("comédia", "sob medida", "mídia"). */
const EXPAND_CACHE = new Map<string, string[]>();
export function expandSynonyms(term: string): string[] {
  const base = stripAccents(term);
  if (!base) return [];
  const cached = EXPAND_CACHE.get(base);
  if (cached) return cached;
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
  const out = Array.from(tokens).filter((t) => t.length >= 4);
  if (EXPAND_CACHE.size >= 500) EXPAND_CACHE.clear();
  EXPAND_CACHE.set(base, out);
  return out;
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
 * Precompute normalizado de uma linha — evita rechamar `stripAccents` e
 * `getSearchableValue` para cada função de match/score. Cache por objeto
 * de linha via WeakMap: liberado automaticamente quando a linha some.
 */
type RowNorm = { perField: Partial<Record<SearchableField, string>>; haystack: string };
const ROW_NORM_CACHE = new WeakMap<object, RowNorm>();
function normalizeRow(row: any): RowNorm {
  if (!row || typeof row !== "object") return { perField: {}, haystack: "" };
  const cached = ROW_NORM_CACHE.get(row);
  if (cached) return cached;
  const perField: Partial<Record<SearchableField, string>> = {};
  const parts: string[] = [];
  for (const f of SEARCHED_FIELDS) {
    const v = stripAccents(getSearchableValue(row, f));
    if (v) {
      perField[f] = v;
      parts.push(v);
    }
  }
  const out: RowNorm = { perField, haystack: parts.join(" ") };
  ROW_NORM_CACHE.set(row, out);
  return out;
}

/** Precompute do termo — evita normalizar/expandir sinônimos várias vezes. */
type TermNorm = {
  normalized: string;
  words: string[];
  synonyms: string[];
  synonymsAll: string[];
  fuzzyTokens: string[];
};
const TERM_NORM_CACHE = new Map<string, TermNorm>();
function normalizeTerm(rawTerm: string): TermNorm {
  const key = String(rawTerm ?? "");
  const cached = TERM_NORM_CACHE.get(key);
  if (cached) return cached;
  const normalized = stripAccents(rawTerm);
  const words = normalized.split(" ").filter((w) => w.length >= 2);
  const synonymsAll = expandSynonyms(rawTerm);
  const synonyms = synonymsAll.filter((s) => s !== normalized);
  const fuzzyTokens = words.length > 0 ? words : [normalized];
  const out: TermNorm = { normalized, words, synonyms, synonymsAll, fuzzyTokens };
  if (TERM_NORM_CACHE.size >= 200) TERM_NORM_CACHE.clear();
  TERM_NORM_CACHE.set(key, out);
  return out;
}

/**
 * Verifica se a linha casa com o termo, tolerando acentos, caixa,
 * ordem de palavras, sinônimos e erros de digitação (fuzzy).
 */
export function rowMatchesTerm(row: any, rawTerm: string): boolean {
  const { normalized, words, synonyms, fuzzyTokens } = normalizeTerm(rawTerm);
  if (!normalized) return false;
  const { haystack } = normalizeRow(row);
  if (!haystack) return false;

  if (haystack.includes(normalized)) return true;
  if (words.length > 0 && words.every((w) => haystack.includes(w))) return true;
  if (synonyms.some((s) => matchesWholeWord(haystack, s))) return true;
  if (fuzzyTokens.every((t) => fuzzyMatchesWord(haystack, t))) return true;
  return false;
}

export function getMatchedFields(row: any, rawTerm: string): SearchableField[] {
  const { normalized, words, synonyms, fuzzyTokens } = normalizeTerm(rawTerm);
  if (!normalized) return [];
  const { perField } = normalizeRow(row);
  const out: SearchableField[] = [];
  for (const field of SEARCHED_FIELDS) {
    const value = perField[field];
    if (!value) continue;
    if (value.includes(normalized)) { out.push(field); continue; }
    if (words.length > 0 && words.every((w) => value.includes(w))) { out.push(field); continue; }
    if (synonyms.some((s) => matchesWholeWord(value, s))) { out.push(field); continue; }
    if (fuzzyTokens.some((t) => fuzzyMatchesWord(value, t))) out.push(field);
  }
  return out;
}

/**
 * Calcula o score de relevância de uma linha para um termo.
 */
export function scoreRow(row: any, rawTerm: string, category?: UserCategory | null): number {
  const { normalized, words, synonymsAll, fuzzyTokens } = normalizeTerm(rawTerm);
  if (!normalized) return 0;
  const { perField } = normalizeRow(row);

  let score = 0;
  let matchedRoleField = false;
  for (const field of SEARCHED_FIELDS) {
    const value = perField[field];
    if (!value) continue;
    const w = FIELD_WEIGHTS[field] ?? 1;
    const isRole = (ROLE_FIELDS as readonly string[]).includes(field);

    let hit = 0;
    if (value === normalized) hit = w * 5;
    else if (value.startsWith(normalized)) hit = w * 3;
    else if (value.includes(normalized)) hit = w * 2;
    else if (words.length > 0 && words.every((word) => value.includes(word))) hit = w;
    else if (synonymsAll.some((s) => s !== normalized && matchesWholeWord(value, s)))
      hit = Math.max(1, Math.floor(w / 2));
    else if (fuzzyTokens.every((t) => fuzzyMatchesWord(value, t)))
      hit = Math.max(1, Math.floor(w / 3));

    if (hit > 0) {
      if (isRole) {
        hit = Math.round(hit * 1.5);
        matchedRoleField = true;
      }
      score += hit;
    }
  }

  if (matchedRoleField) score += 20;
  if (category && CATEGORY_BONUS[category] != null) score += CATEGORY_BONUS[category];
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

  // Tokens exatos: termo inteiro + palavras individuais + sinônimos expandidos.
  const baseTokens = new Set<string>([nTerm, ...nTerm.split(" ")]);
  for (const syn of expandSynonyms(rawTerm)) baseTokens.add(syn);
  const tokens = Array.from(baseTokens)
    .map((t) => t.trim())
    .filter((t) => t.length >= 2)
    .sort((a, b) => b.length - a.length);
  if (tokens.length === 0) return [{ text: src, hit: false }];

  // Normaliza src caractere-a-caractere mantendo o índice original.
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

  const ranges: Array<[number, number]> = [];
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

  // Fuzzy — para cada palavra do termo, destaca palavras do src cuja
  // distância de edição esteja dentro da tolerância (ex.: "liebrador" ↔
  // "liberador"). Percorre limites de palavra do texto normalizado.
  const fuzzyTerms = Array.from(baseTokens)
    .filter((t) => t.length >= 4);
  if (fuzzyTerms.length > 0) {
    const wordRe = /[a-z0-9]+/g;
    let m: RegExpExecArray | null;
    while ((m = wordRe.exec(norm)) !== null) {
      const w = m[0];
      for (const t of fuzzyTerms) {
        const tol = fuzzyTolerance(t.length);
        if (tol === 0) continue;
        if (Math.abs(w.length - t.length) > tol) continue;
        if (levenshtein(w, t) <= tol) {
          const start = origIdx[m.index];
          const end = origIdx[m.index + w.length - 1] + 1;
          ranges.push([start, end]);
          break;
        }
      }
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
