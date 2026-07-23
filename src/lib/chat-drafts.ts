/**
 * Rascunhos de conversa (texto + anexos) preservados entre navegações.
 *
 * - Texto: persistido em localStorage (`fixxer_chat_draft_text:<peerId>`)
 *   para sobreviver a reloads e cross-tab.
 * - Anexos (File[]): mantidos em cache de módulo em memória — objetos File não
 *   podem ser serializados; se a aba fechar, precisam ser reselecionados,
 *   mas navegações internas preservam.
 * - Estado "visto" (mock): localStorage, cross-tab automaticamente (storage
 *   event) + custom event local para reatividade na mesma aba.
 */

const KEY = "fixxer_chat_draft_text";
const filesCache = new Map<string, File[]>();

export function getDraftText(peerId: string): string {
  if (!peerId || typeof window === "undefined") return "";
  try {
    return localStorage.getItem(`${KEY}:${peerId}`) || "";
  } catch {
    return "";
  }
}

export function setDraftText(peerId: string, text: string) {
  if (!peerId || typeof window === "undefined") return;
  try {
    if (text) localStorage.setItem(`${KEY}:${peerId}`, text);
    else localStorage.removeItem(`${KEY}:${peerId}`);
  } catch {}
}

export function clearDraft(peerId: string) {
  setDraftText(peerId, "");
  filesCache.delete(peerId);
}

/* -------- Multi-anexos (nova API) -------- */

export function getDraftFiles(peerId: string): File[] {
  return filesCache.get(peerId) ?? [];
}

export function setDraftFiles(peerId: string, files: File[] | null) {
  if (!peerId) return;
  if (files && files.length) filesCache.set(peerId, files);
  else filesCache.delete(peerId);
}

/* -------- Compat single-file -------- */

export function getDraftFile(peerId: string): File | null {
  const list = getDraftFiles(peerId);
  return list[0] ?? null;
}

export function setDraftFile(peerId: string, file: File | null) {
  setDraftFiles(peerId, file ? [file] : null);
}

/**
 * Marca uma conversa mock como "aberta agora" para zerar o badge de não-lidas.
 * Grava em localStorage (cross-tab automático via evento `storage`) e emite
 * um custom event local para atualizar a aba corrente.
 */
const MOCK_SEEN_KEY = "fixxer_mock_chat_seen";

export function markMockConversationSeen(peerId: string) {
  if (!peerId || typeof window === "undefined") return;
  try {
    const raw = localStorage.getItem(MOCK_SEEN_KEY);
    const map = raw ? JSON.parse(raw) : {};
    map[peerId] = Date.now();
    localStorage.setItem(MOCK_SEEN_KEY, JSON.stringify(map));
    window.dispatchEvent(new CustomEvent("fixxer:messages-read"));
  } catch {}
}

export function getMockSeenAt(peerId: string): number {
  if (!peerId || typeof window === "undefined") return 0;
  try {
    const raw = localStorage.getItem(MOCK_SEEN_KEY);
    const map = raw ? JSON.parse(raw) : {};
    return typeof map[peerId] === "number" ? map[peerId] : 0;
  } catch {
    return 0;
  }
}

export const MOCK_SEEN_STORAGE_KEY = MOCK_SEEN_KEY;
