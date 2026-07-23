/**
 * Rascunhos de conversa (texto + anexo) preservados entre navegações.
 *
 * - Texto: persistido em localStorage (`fixxer_chat_draft_text:<peerId>`)
 *   para sobreviver a reloads.
 * - Anexo (File): mantido em cache de módulo em memória — File objects não
 *   podem ser serializados; se a aba fechar, o anexo precisa ser reselecionado,
 *   mas navegações internas (ex.: abrir perfil e voltar) preservam.
 */

const KEY = "fixxer_chat_draft_text";
const fileCache = new Map<string, File>();

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
  fileCache.delete(peerId);
}

export function getDraftFile(peerId: string): File | null {
  return fileCache.get(peerId) ?? null;
}

export function setDraftFile(peerId: string, file: File | null) {
  if (!peerId) return;
  if (file) fileCache.set(peerId, file);
  else fileCache.delete(peerId);
}

/**
 * Marca uma conversa mock como "aberta agora" para zerar o badge de não-lidas.
 * Usado pelo inbox mock (que não persiste no banco).
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
