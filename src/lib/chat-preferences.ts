/**
 * Preferências de conversas (arquivar / silenciar / roles do peer).
 *
 * Persistência primária: tabela `public.chat_conversation_state` no Supabase
 * externo (funciona entre dispositivos). Persistência secundária: localStorage
 * como cache offline / fallback quando a tabela não existir ainda.
 *
 * API mantida síncrona para não quebrar consumidores: `hydrateChatPreferences`
 * deve ser chamado uma vez após login (a Inbox já faz isso) e os setters
 * gravam de forma otimista no cache + localStorage e em seguida sincronizam
 * com o Supabase em background.
 */

import { supabaseExternal } from "@/lib/supabaseExternal";

const ARCHIVED_KEY = "fixxer_chat_archived";
const MUTED_KEY = "fixxer_chat_muted";
const PEER_ROLE_KEY = "fixxer_chat_peer_roles";
const LAST_READ_KEY = "fixxer_chat_last_read";

// Cache em memória (evita ler localStorage em cada render)
const memArchived = new Map<string, Set<string>>();
const memMuted = new Map<string, Set<string>>();
const memLastRead = new Map<string, Record<string, string>>();

function readSetLS(key: string, userId: string): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = localStorage.getItem(`${key}:${userId}`);
    if (!raw) return new Set();
    const arr = JSON.parse(raw);
    return new Set(Array.isArray(arr) ? arr : []);
  } catch {
    return new Set();
  }
}

function writeSetLS(key: string, userId: string, set: Set<string>) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(`${key}:${userId}`, JSON.stringify(Array.from(set)));
    window.dispatchEvent(new CustomEvent("fixxer:chat-prefs-changed"));
  } catch {}
}

function getArchived(userId: string): Set<string> {
  let s = memArchived.get(userId);
  if (!s) {
    s = readSetLS(ARCHIVED_KEY, userId);
    memArchived.set(userId, s);
  }
  return s;
}

function getMuted(userId: string): Set<string> {
  let s = memMuted.get(userId);
  if (!s) {
    s = readSetLS(MUTED_KEY, userId);
    memMuted.set(userId, s);
  }
  return s;
}

/** Carrega estado da tabela `chat_conversation_state` no Supabase. */
export async function hydrateChatPreferences(userId: string): Promise<void> {
  if (!userId) return;
  try {
    const { data, error } = await supabaseExternal
      .from("chat_conversation_state")
      .select("peer_id, archived, muted, last_read_at")
      .eq("user_id", userId);
    if (error) return;
    const arch = new Set<string>();
    const mut = new Set<string>();
    const reads: Record<string, string> = {};
    for (const row of (data as any[]) ?? []) {
      if (row.archived) arch.add(row.peer_id);
      if (row.muted) mut.add(row.peer_id);
      if (row.last_read_at) reads[row.peer_id] = row.last_read_at;
    }
    memArchived.set(userId, arch);
    memMuted.set(userId, mut);
    memLastRead.set(userId, reads);
    writeSetLS(ARCHIVED_KEY, userId, arch);
    writeSetLS(MUTED_KEY, userId, mut);
    try { localStorage.setItem(`${LAST_READ_KEY}:${userId}`, JSON.stringify(reads)); } catch {}
  } catch {}
}

async function upsertState(
  userId: string,
  peerId: string,
  patch: { archived?: boolean; muted?: boolean; last_read_at?: string },
) {
  try {
    await supabaseExternal
      .from("chat_conversation_state")
      .upsert(
        { user_id: userId, peer_id: peerId, ...patch, updated_at: new Date().toISOString() },
        { onConflict: "user_id,peer_id" },
      );
  } catch {}
}

export function getLastReadAt(userId: string, peerId: string): string | null {
  let map = memLastRead.get(userId);
  if (!map) {
    try {
      const raw = typeof window !== "undefined" ? localStorage.getItem(`${LAST_READ_KEY}:${userId}`) : null;
      map = raw ? JSON.parse(raw) : {};
    } catch { map = {}; }
    memLastRead.set(userId, map!);
  }
  return (map && map[peerId]) || null;
}

export function markConversationReadLocal(userId: string, peerId: string, at: string = new Date().toISOString()) {
  const map = { ...(memLastRead.get(userId) || {}) };
  const prev = map[peerId];
  if (prev && new Date(prev).getTime() >= new Date(at).getTime()) return;
  map[peerId] = at;
  memLastRead.set(userId, map);
  try {
    if (typeof window !== "undefined") {
      localStorage.setItem(`${LAST_READ_KEY}:${userId}`, JSON.stringify(map));
      window.dispatchEvent(new CustomEvent("fixxer:chat-prefs-changed"));
    }
  } catch {}
  void upsertState(userId, peerId, { last_read_at: at });
}

export function isConversationArchived(userId: string, peerId: string): boolean {
  return getArchived(userId).has(peerId);
}

export function setConversationArchived(userId: string, peerId: string, value: boolean) {
  const set = getArchived(userId);
  if (value) set.add(peerId);
  else set.delete(peerId);
  writeSetLS(ARCHIVED_KEY, userId, set);
  void upsertState(userId, peerId, { archived: value });
}

export function isConversationMuted(userId: string, peerId: string): boolean {
  return getMuted(userId).has(peerId);
}

export function setConversationMuted(userId: string, peerId: string, value: boolean) {
  const set = getMuted(userId);
  if (value) set.add(peerId);
  else set.delete(peerId);
  writeSetLS(MUTED_KEY, userId, set);
  void upsertState(userId, peerId, { muted: value });
}

export function getArchivedSet(userId: string): Set<string> {
  return new Set(getArchived(userId));
}

export function getMutedSet(userId: string): Set<string> {
  return new Set(getMuted(userId));
}

/** Cache local de role por peerId. */
export function getCachedPeerRole(peerId: string): string | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(PEER_ROLE_KEY);
    const map = raw ? JSON.parse(raw) : {};
    return typeof map[peerId] === "string" ? map[peerId] : null;
  } catch {
    return null;
  }
}

export function setCachedPeerRoles(entries: Record<string, string>) {
  if (typeof window === "undefined") return;
  try {
    const raw = localStorage.getItem(PEER_ROLE_KEY);
    const map = raw ? JSON.parse(raw) : {};
    Object.assign(map, entries);
    localStorage.setItem(PEER_ROLE_KEY, JSON.stringify(map));
  } catch {}
}

const COMPAT: Record<string, string[]> = {
  lojista: ["prestador", "parceiro", "fornecedor", "cliente", "casual", "admin"],
  prestador: ["lojista", "cliente", "casual", "admin"],
  parceiro: ["lojista", "admin"],
  fornecedor: ["lojista", "admin"],
  cliente: ["lojista", "prestador", "admin"],
  casual: ["lojista", "prestador", "admin"],
  admin: ["lojista", "prestador", "parceiro", "fornecedor", "cliente", "casual", "admin"],
};

function normalizeRole(r: string | null | undefined): string {
  const s = (r || "").toLowerCase();
  if (!s) return "";
  if (s.includes("lojista")) return "lojista";
  if (s.includes("prestador")) return "prestador";
  if (s.includes("parceiro")) return "parceiro";
  if (s.includes("fornecedor")) return "fornecedor";
  if (s.includes("cliente")) return "cliente";
  if (s.includes("casual")) return "casual";
  if (s.includes("admin") || s.includes("master")) return "admin";
  return s;
}

export function canSeeConversationWith(myRole: string | null | undefined, peerRole: string | null | undefined) {
  const mine = normalizeRole(myRole);
  const peer = normalizeRole(peerRole);
  if (!mine || !peer) return true;
  const allowed = COMPAT[mine];
  if (!allowed) return true;
  return allowed.includes(peer);
}

/** Rota padrão de Feed conforme role — fallback consistente global. */
export function resolveFeedRoute(rawRole: string | null | undefined): { to: string; search?: Record<string, string> } {
  const r = normalizeRole(rawRole);
  if (r === "lojista") return { to: "/feed", search: { tab: "prestadores" } };
  if (r === "prestador") return { to: "/feed", search: { tab: "demandas_lojista" } };
  if (r === "parceiro" || r === "fornecedor") return { to: "/feed", search: { tab: "parceiros" } };
  if (r === "cliente" || r === "casual") return { to: "/feed", search: { tab: "obras_b2c" } };
  if (r === "admin") return { to: "/feed" };
  // Fallback seguro: role ausente/desconhecida → feed geral
  return { to: "/feed" };
}
