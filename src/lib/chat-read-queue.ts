/**
 * Fila persistente com retry/backoff para "marcar mensagens como lidas".
 * Garante consistência do badge mesmo com falhas temporárias de Realtime/Supabase.
 *
 * Estratégia:
 * - Cada ação vira uma entrada em localStorage: { kind, payload, attempts, nextAt }.
 * - Um único worker processa a fila em ordem, com backoff exponencial (2s, 4s, 8s...).
 * - Reprocessa ao ganhar rede (online) e ao voltar para a aba (visibilitychange).
 * - Exposto: enqueueMarkConversationRead / enqueueMarkAllRead / flushChatReadQueue.
 */

import { supabaseExternal } from "@/lib/supabaseExternal";

type QueueItem =
  | { id: string; kind: "conv"; userId: string; peerId: string; at: string; attempts: number; nextAt: number }
  | { id: string; kind: "all"; userId: string; at: string; attempts: number; nextAt: number };

const KEY = "fixxer_chat_read_queue_v1";
const MAX_ATTEMPTS = 8;

function read(): QueueItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

function write(items: QueueItem[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(KEY, JSON.stringify(items));
  } catch {}
}

function newId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

let running = false;

async function processItem(item: QueueItem): Promise<boolean> {
  try {
    if (item.kind === "all") {
      const { error } = await supabaseExternal
        .from("messages")
        .update({ read: true })
        .eq("recipient_id", item.userId)
        .eq("read", false);
      if (error) throw error;
    } else {
      const { error } = await supabaseExternal
        .from("messages")
        .update({ read: true })
        .eq("recipient_id", item.userId)
        .eq("sender_id", item.peerId)
        .eq("read", false);
      if (error) throw error;
    }
    // Best-effort: atualiza last_read_at da conversa (se coluna existir)
    try {
      if (item.kind === "conv") {
        await supabaseExternal
          .from("chat_conversation_state")
          .upsert(
            { user_id: item.userId, peer_id: item.peerId, last_read_at: item.at, updated_at: new Date().toISOString() },
            { onConflict: "user_id,peer_id" },
          );
      }
    } catch {}
    return true;
  } catch {
    return false;
  }
}

export async function flushChatReadQueue(): Promise<void> {
  if (running) return;
  running = true;
  try {
    let items = read();
    const now = Date.now();
    const still: QueueItem[] = [];
    for (const it of items) {
      if (it.nextAt > now) { still.push(it); continue; }
      const ok = await processItem(it);
      if (ok) continue;
      const attempts = it.attempts + 1;
      if (attempts >= MAX_ATTEMPTS) continue; // desiste silenciosamente
      const delay = Math.min(60_000, 2000 * 2 ** attempts);
      still.push({ ...it, attempts, nextAt: Date.now() + delay });
    }
    write(still);
    if (still.some((s) => s.nextAt <= Date.now() + 100)) {
      // ainda tem trabalho — agenda próxima rodada
      setTimeout(() => { void flushChatReadQueue(); }, 250);
    } else if (still.length > 0) {
      const minNext = Math.min(...still.map((s) => s.nextAt));
      setTimeout(() => { void flushChatReadQueue(); }, Math.max(500, minNext - Date.now()));
    }
    // Notifica a UI para recalcular o badge global
    try { window.dispatchEvent(new CustomEvent("fixxer:messages-read")); } catch {}
  } finally {
    running = false;
  }
}

export function enqueueMarkAllRead(userId: string) {
  if (!userId) return;
  const items = read();
  items.push({ id: newId(), kind: "all", userId, at: new Date().toISOString(), attempts: 0, nextAt: Date.now() });
  write(items);
  void flushChatReadQueue();
}

export function enqueueMarkConversationRead(userId: string, peerId: string) {
  if (!userId || !peerId) return;
  const items = read();
  items.push({
    id: newId(),
    kind: "conv",
    userId,
    peerId,
    at: new Date().toISOString(),
    attempts: 0,
    nextAt: Date.now(),
  });
  write(items);
  void flushChatReadQueue();
}

/** Inicializa listeners globais que reativam a fila. Chame uma vez no root. */
export function initChatReadQueue() {
  if (typeof window === "undefined") return;
  const kick = () => { void flushChatReadQueue(); };
  window.addEventListener("online", kick);
  document.addEventListener("visibilitychange", () => { if (!document.hidden) kick(); });
  // primeira execução ao carregar
  setTimeout(kick, 500);
}
