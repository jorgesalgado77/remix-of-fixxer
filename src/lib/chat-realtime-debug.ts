// Bus leve de telemetria do Realtime do chat: status do listener por sala e
// contagem de mensagens/eventos recebidos. Consumido pelo painel de debug.

export type RealtimeStatus =
  | "idle"
  | "connecting"
  | "connected"
  | "reconnecting"
  | "closed"
  | "error";

export type RoomStats = {
  room: string;
  status: RealtimeStatus;
  received: number;      // mensagens recebidas via postgres_changes
  broadcasts: number;    // eventos broadcast (typing, message-new)
  reconnects: number;    // nº de tentativas de reconexão
  lastEventAt: number | null;
  lastStatusAt: number;
};

type Listener = (rooms: Record<string, RoomStats>) => void;

const rooms: Record<string, RoomStats> = {};
const listeners = new Set<Listener>();

function emit() {
  for (const l of listeners) {
    try { l({ ...rooms }); } catch { /* ignore */ }
  }
}

function ensure(room: string): RoomStats {
  if (!rooms[room]) {
    rooms[room] = {
      room,
      status: "idle",
      received: 0,
      broadcasts: 0,
      reconnects: 0,
      lastEventAt: null,
      lastStatusAt: Date.now(),
    };
  }
  return rooms[room];
}

export function setRoomStatus(room: string, status: RealtimeStatus) {
  const s = ensure(room);
  if (status === "reconnecting" && s.status !== "reconnecting") s.reconnects += 1;
  s.status = status;
  s.lastStatusAt = Date.now();
  emit();
}

export function incrRoomEvent(room: string, kind: "message" | "broadcast" = "message") {
  const s = ensure(room);
  if (kind === "message") s.received += 1;
  else s.broadcasts += 1;
  s.lastEventAt = Date.now();
  emit();
}

export function clearRoom(room: string) {
  delete rooms[room];
  emit();
}

export function subscribeRealtimeDebug(listener: Listener): () => void {
  listeners.add(listener);
  try { listener({ ...rooms }); } catch { /* ignore */ }
  return () => { listeners.delete(listener); };
}

export function getRealtimeSnapshot(): Record<string, RoomStats> {
  return { ...rooms };
}

/**
 * Detecta o erro benigno "relation is already member of publication".
 * Útil para silenciar toasts em fluxos que executam SQL idempotente.
 */
export function isBenignPublicationError(err: unknown): boolean {
  const msg = String((err as any)?.message ?? err ?? "");
  return /already member of publication/i.test(msg) || /42710/.test(msg);
}
