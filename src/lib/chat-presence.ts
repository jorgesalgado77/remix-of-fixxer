/**
 * Presença global do chat.
 *
 * Um único canal Realtime (`chat-online-global`) rastreia todos os usuários
 * autenticados conectados no momento. Consumidores (inbox e sala de chat)
 * podem consultar `isPeerOnline(peerId)` ou assinar mudanças via
 * `subscribeGlobalPresence(cb)`.
 */
import { supabaseExternal } from "@/lib/supabaseExternal";

const CHANNEL_NAME = "chat-online-global";
let channel: any = null;
let currentUid: string | null = null;
const onlineSet = new Set<string>();
const listeners = new Set<(online: Set<string>) => void>();

function emit() {
  const snapshot = new Set(onlineSet);
  for (const cb of listeners) {
    try { cb(snapshot); } catch { /* ignore */ }
  }
  try { window.dispatchEvent(new CustomEvent("fixxer:chat-presence-changed")); } catch { /* ignore */ }
}

function refreshFromState(state: Record<string, any[]>) {
  onlineSet.clear();
  for (const key of Object.keys(state || {})) onlineSet.add(key);
  emit();
}

export function startGlobalPresence(uid: string) {
  if (typeof window === "undefined" || !uid) return;
  if (channel && currentUid === uid) return;
  if (channel) stopGlobalPresence();
  currentUid = uid;
  try {
    channel = supabaseExternal.channel(CHANNEL_NAME, {
      config: { presence: { key: uid } },
    });
    channel
      .on("presence", { event: "sync" }, () => refreshFromState(channel.presenceState()))
      .on("presence", { event: "join" }, ({ key }: any) => { if (key) { onlineSet.add(key); emit(); } })
      .on("presence", { event: "leave" }, ({ key }: any) => { if (key) { onlineSet.delete(key); emit(); } })
      .subscribe(async (status: string) => {
        if (status === "SUBSCRIBED") {
          try { await channel.track({ online_at: Date.now() }); } catch { /* ignore */ }
        }
      });
  } catch { /* ignore */ }
}

export function stopGlobalPresence() {
  try { if (channel) supabaseExternal.removeChannel(channel); } catch { /* ignore */ }
  channel = null;
  currentUid = null;
  onlineSet.clear();
  emit();
}

export function isPeerOnline(peerId: string | null | undefined): boolean {
  if (!peerId) return false;
  return onlineSet.has(peerId);
}

export function getOnlineSet(): Set<string> {
  return new Set(onlineSet);
}

export function subscribeGlobalPresence(cb: (online: Set<string>) => void): () => void {
  listeners.add(cb);
  try { cb(new Set(onlineSet)); } catch { /* ignore */ }
  return () => { listeners.delete(cb); };
}
