/**
 * Status derivado deterministicamente do ID do item de feed.
 * Serve como camada mock para filtros por status (Proposto / Em Andamento / Finalizado / Aberto).
 */

export type FeedStatus = "aberto" | "proposto" | "em_andamento" | "finalizado";

export const FEED_STATUS_LABEL: Record<FeedStatus, string> = {
  aberto: "Aberto",
  proposto: "Proposto",
  em_andamento: "Em Andamento",
  finalizado: "Finalizado",
};

export const FEED_STATUS_COLOR: Record<FeedStatus, string> = {
  aberto: "#94A3B8",       // cinza
  proposto: "#00E5FF",     // ciano
  em_andamento: "#FF9F0A", // âmbar
  finalizado: "#00FF87",   // verde
};

/** Hash simples e determinístico de uma string. */
function hashCode(str: string): number {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = (h << 5) - h + str.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h);
}

const CYCLE: FeedStatus[] = ["aberto", "proposto", "em_andamento", "finalizado"];

/** Retorna um FeedStatus estável para um id de post. */
export function getFeedStatus(id: string): FeedStatus {
  return CYCLE[hashCode(id) % CYCLE.length];
}

export type StatusFilterKey = "todos" | FeedStatus;

export const STATUS_FILTERS: { key: StatusFilterKey; label: string }[] = [
  { key: "todos", label: "Todos" },
  { key: "aberto", label: "Aberto" },
  { key: "proposto", label: "Proposto" },
  { key: "em_andamento", label: "Em Andamento" },
  { key: "finalizado", label: "Finalizado" },
];
