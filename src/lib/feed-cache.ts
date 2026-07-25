/**
 * Cache local (localStorage) de listas do Feed para abertura instantânea
 * mesmo em conexões instáveis. Estratégia stale-while-revalidate:
 *  1. Ao montar, o feed lê `readFeedCache` para exibir o último snapshot.
 *  2. Em paralelo, dispara o fetch real; ao sucesso, grava `writeFeedCache`.
 *  3. Falhas mantêm o snapshot antigo visível — só o `FeedErrorState`
 *     aparece se não houver cache algum.
 */
const PREFIX = "fixxer_feed_cache_";
const DEFAULT_TTL = 1000 * 60 * 60 * 6; // 6 horas

type Snapshot<T> = { at: number; data: T };

export function readFeedCache<T>(key: string, ttlMs: number = DEFAULT_TTL): T | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(PREFIX + key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Snapshot<T>;
    if (Date.now() - parsed.at > ttlMs) return null;
    return parsed.data;
  } catch {
    return null;
  }
}

export function writeFeedCache<T>(key: string, data: T): void {
  if (typeof window === "undefined") return;
  try {
    const snap: Snapshot<T> = { at: Date.now(), data };
    window.localStorage.setItem(PREFIX + key, JSON.stringify(snap));
  } catch {
    // quota / modo privado — ignora silenciosamente
  }
}

export function clearFeedCache(key: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(PREFIX + key);
  } catch {
    // ignore
  }
}

/** Classifica um erro de fetch para exibição amigável. */
export type FeedErrorKind = "offline" | "timeout" | "network" | "unknown";

export function describeFeedError(err: unknown): { kind: FeedErrorKind; message: string } {
  if (typeof navigator !== "undefined" && navigator.onLine === false) {
    return { kind: "offline", message: "Você está sem conexão com a internet." };
  }
  const raw = err instanceof Error ? err.message : typeof err === "string" ? err : "";
  const low = raw.toLowerCase();
  if (low.includes("abort") || low.includes("timeout")) {
    return { kind: "timeout", message: "O servidor demorou demais para responder." };
  }
  if (low.includes("network") || low.includes("failed to fetch") || low.includes("networkerror")) {
    return { kind: "network", message: "Falha de rede ao contatar o servidor." };
  }
  return { kind: "unknown", message: raw || "Não foi possível atualizar o feed." };
}
