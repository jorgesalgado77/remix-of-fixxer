/**
 * Preferências locais de conversas (arquivar / silenciar / roles do peer).
 * Persistência via localStorage por usuário. Uma migração futura para
 * uma tabela `chat_conversation_state` pode substituir este armazenamento
 * mantendo a mesma API.
 */

const ARCHIVED_KEY = "fixxer_chat_archived";
const MUTED_KEY = "fixxer_chat_muted";
const PEER_ROLE_KEY = "fixxer_chat_peer_roles";

function readSet(key: string, userId: string): Set<string> {
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

function writeSet(key: string, userId: string, set: Set<string>) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(`${key}:${userId}`, JSON.stringify(Array.from(set)));
    window.dispatchEvent(new CustomEvent("fixxer:chat-prefs-changed"));
  } catch {}
}

export function isConversationArchived(userId: string, peerId: string): boolean {
  return readSet(ARCHIVED_KEY, userId).has(peerId);
}

export function setConversationArchived(userId: string, peerId: string, value: boolean) {
  const set = readSet(ARCHIVED_KEY, userId);
  if (value) set.add(peerId);
  else set.delete(peerId);
  writeSet(ARCHIVED_KEY, userId, set);
}

export function isConversationMuted(userId: string, peerId: string): boolean {
  return readSet(MUTED_KEY, userId).has(peerId);
}

export function setConversationMuted(userId: string, peerId: string, value: boolean) {
  const set = readSet(MUTED_KEY, userId);
  if (value) set.add(peerId);
  else set.delete(peerId);
  writeSet(MUTED_KEY, userId, set);
}

export function getArchivedSet(userId: string): Set<string> {
  return readSet(ARCHIVED_KEY, userId);
}

export function getMutedSet(userId: string): Set<string> {
  return readSet(MUTED_KEY, userId);
}

/** Cache local de role por peerId para evitar refetch a cada render. */
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

/**
 * Mapa de compatibilidade de roles para o Inbox.
 * Interpretação: o usuário só deve ver conversas com contatos cujo papel
 * faça sentido dentro do seu perfil no aplicativo.
 */
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

/**
 * Regra de acesso: retorna true quando `peerRole` é compatível com `myRole`.
 * Fallback seguro: se qualquer um dos papéis for desconhecido, mostra a
 * conversa (não bloqueia navegação já existente).
 */
export function canSeeConversationWith(myRole: string | null | undefined, peerRole: string | null | undefined) {
  const mine = normalizeRole(myRole);
  const peer = normalizeRole(peerRole);
  if (!mine || !peer) return true;
  const allowed = COMPAT[mine];
  if (!allowed) return true;
  return allowed.includes(peer);
}
