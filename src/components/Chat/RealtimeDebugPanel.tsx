import { useEffect, useState } from "react";
import { Activity, X, Wifi, WifiOff, RefreshCw, Radio } from "lucide-react";
import {
  subscribeRealtimeDebug,
  type RoomStats,
  type RealtimeStatus,
} from "@/lib/chat-realtime-debug";

const STORAGE_KEY = "fixxer:chat-debug-visible";

function statusColor(s: RealtimeStatus): string {
  switch (s) {
    case "connected": return "text-emerald-400 bg-emerald-500/10 border-emerald-500/30";
    case "connecting": return "text-sky-300 bg-sky-500/10 border-sky-500/30";
    case "reconnecting": return "text-amber-300 bg-amber-500/10 border-amber-500/30";
    case "error": return "text-red-300 bg-red-500/10 border-red-500/30";
    case "closed": return "text-zinc-400 bg-zinc-500/10 border-zinc-500/30";
    default: return "text-zinc-400 bg-zinc-500/10 border-zinc-500/30";
  }
}

function statusLabel(s: RealtimeStatus): string {
  return {
    idle: "aguardando",
    connecting: "conectando",
    connected: "conectado",
    reconnecting: "reconectando",
    closed: "fechado",
    error: "erro",
  }[s];
}

function StatusIcon({ s }: { s: RealtimeStatus }) {
  if (s === "connected") return <Wifi className="w-3 h-3" />;
  if (s === "reconnecting" || s === "connecting") return <RefreshCw className="w-3 h-3 animate-spin" />;
  if (s === "error" || s === "closed") return <WifiOff className="w-3 h-3" />;
  return <Radio className="w-3 h-3" />;
}

export function ChatRealtimeDebugPanel() {
  const [visible, setVisible] = useState<boolean>(() => {
    try { return localStorage.getItem(STORAGE_KEY) === "1"; } catch { return false; }
  });
  const [rooms, setRooms] = useState<Record<string, RoomStats>>({});

  // Atalho Ctrl/Cmd + Shift + D para abrir/fechar
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === "d") {
        e.preventDefault();
        setVisible((v) => {
          const next = !v;
          try { localStorage.setItem(STORAGE_KEY, next ? "1" : "0"); } catch {}
          return next;
        });
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (!visible) return;
    const unsub = subscribeRealtimeDebug(setRooms);
    return () => unsub();
  }, [visible]);

  if (!visible) {
    return (
      <button
        type="button"
        onClick={() => { setVisible(true); try { localStorage.setItem(STORAGE_KEY, "1"); } catch {} }}
        className="fixed bottom-3 right-3 z-[9999] p-2 rounded-full bg-zinc-900/80 border border-white/10 text-zinc-300 hover:text-white hover:bg-zinc-800 shadow-lg backdrop-blur"
        title="Abrir console do Realtime (Ctrl+Shift+D)"
        aria-label="Abrir console do Realtime"
      >
        <Activity className="w-4 h-4" />
      </button>
    );
  }

  const entries = Object.values(rooms).sort((a, b) => (b.lastEventAt ?? 0) - (a.lastEventAt ?? 0));

  return (
    <div
      className="fixed bottom-3 right-3 z-[9999] w-[320px] max-h-[70vh] rounded-xl bg-zinc-950/95 border border-white/10 shadow-2xl backdrop-blur text-xs text-zinc-200 flex flex-col overflow-hidden"
      role="dialog"
      aria-label="Console do Realtime"
    >
      <div className="flex items-center justify-between px-3 py-2 border-b border-white/10 bg-zinc-900/60">
        <div className="flex items-center gap-2 font-semibold">
          <Activity className="w-3.5 h-3.5 text-emerald-400" />
          Realtime · Chat
        </div>
        <button
          type="button"
          onClick={() => { setVisible(false); try { localStorage.setItem(STORAGE_KEY, "0"); } catch {} }}
          className="p-1 rounded hover:bg-white/10"
          aria-label="Fechar"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="flex-1 overflow-auto p-2 space-y-2">
        {entries.length === 0 && (
          <div className="text-zinc-500 text-center py-4">
            Nenhuma sala ativa.<br />
            Abra uma conversa para monitorar.
          </div>
        )}
        {entries.map((r) => (
          <div key={r.room} className="rounded-lg border border-white/10 bg-zinc-900/60 p-2">
            <div className="flex items-center justify-between gap-2">
              <div className="font-mono text-[10px] truncate text-zinc-400" title={r.room}>
                {r.room}
              </div>
              <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md border text-[10px] ${statusColor(r.status)}`}>
                <StatusIcon s={r.status} />
                {statusLabel(r.status)}
              </span>
            </div>
            <div className="mt-1.5 grid grid-cols-3 gap-1 text-[10px]">
              <div className="rounded bg-zinc-800/60 px-1.5 py-1">
                <div className="text-zinc-500">msgs</div>
                <div className="font-semibold text-emerald-300">{r.received}</div>
              </div>
              <div className="rounded bg-zinc-800/60 px-1.5 py-1">
                <div className="text-zinc-500">bcast</div>
                <div className="font-semibold text-sky-300">{r.broadcasts}</div>
              </div>
              <div className="rounded bg-zinc-800/60 px-1.5 py-1">
                <div className="text-zinc-500">reconn</div>
                <div className="font-semibold text-amber-300">{r.reconnects}</div>
              </div>
            </div>
            {r.lastEventAt && (
              <div className="mt-1 text-[10px] text-zinc-500">
                último evento · {new Date(r.lastEventAt).toLocaleTimeString()}
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="px-3 py-1.5 border-t border-white/10 text-[10px] text-zinc-500 bg-zinc-900/40">
        Ctrl+Shift+D para alternar
      </div>
    </div>
  );
}
