import { useEffect, useRef, useState } from "react";
import { Mic, Square, Trash2 } from "lucide-react";

interface Props {
  onRecorded: (file: File) => void;
  disabled?: boolean;
}

/**
 * FIXXER — Gravador de mensagens de áudio.
 * - Usa MediaRecorder (WebM/Opus). Se indisponível, renderiza null (fallback silencioso).
 * - UX: clicar para iniciar; enquanto grava mostra timer + Parar + Cancelar.
 * - Ao parar, gera um File `audio-YYYYMMDDHHMMSS.webm` e chama onRecorded().
 */
export function ChatVoiceRecorder({ onRecorded, disabled }: Props) {
  const supported = typeof window !== "undefined" && typeof (window as any).MediaRecorder !== "undefined";
  const [recording, setRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const recRef = useRef<any>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<number | null>(null);
  const cancelledRef = useRef(false);

  useEffect(() => () => cleanup(), []);

  function cleanup() {
    if (timerRef.current) { window.clearInterval(timerRef.current); timerRef.current = null; }
    try { streamRef.current?.getTracks().forEach((t) => t.stop()); } catch {}
    streamRef.current = null;
    recRef.current = null;
    chunksRef.current = [];
    setRecording(false);
    setSeconds(0);
  }

  async function start() {
    if (!supported || disabled) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const mr = new (window as any).MediaRecorder(stream, { mimeType: "audio/webm" });
      recRef.current = mr;
      chunksRef.current = [];
      cancelledRef.current = false;
      mr.ondataavailable = (e: any) => { if (e.data?.size > 0) chunksRef.current.push(e.data); };
      mr.onstop = () => {
        const cancelled = cancelledRef.current;
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        cleanup();
        if (!cancelled && blob.size > 0) {
          const stamp = new Date().toISOString().replace(/[-:T.Z]/g, "").slice(0, 14);
          const file = new File([blob], `audio-${stamp}.webm`, { type: "audio/webm" });
          onRecorded(file);
        }
      };
      mr.start();
      setRecording(true);
      setSeconds(0);
      timerRef.current = window.setInterval(() => setSeconds((s) => s + 1), 1000);
    } catch {
      // Permissão negada / sem mic — silencioso.
      cleanup();
    }
  }

  function stop(cancel = false) {
    cancelledRef.current = cancel;
    try { recRef.current?.stop(); } catch { cleanup(); }
  }

  if (!supported) return null;

  const mm = String(Math.floor(seconds / 60)).padStart(2, "0");
  const ss = String(seconds % 60).padStart(2, "0");

  if (!recording) {
    return (
      <button
        type="button"
        onClick={start}
        disabled={disabled}
        aria-label="Gravar mensagem de áudio"
        title="Gravar áudio"
        className="w-11 h-11 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 flex items-center justify-center disabled:opacity-40"
      >
        <Mic className="w-4 h-4" />
      </button>
    );
  }

  return (
    <div className="flex items-center gap-1.5 bg-red-500/10 border border-red-500/30 rounded-2xl px-2 h-11">
      <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" aria-hidden />
      <span className="text-xs font-mono tabular-nums text-red-200" aria-live="polite">
        {mm}:{ss}
      </span>
      <button
        type="button"
        onClick={() => stop(true)}
        aria-label="Cancelar gravação"
        title="Cancelar"
        className="w-8 h-8 rounded-xl hover:bg-white/10 flex items-center justify-center text-red-300"
      >
        <Trash2 className="w-4 h-4" />
      </button>
      <button
        type="button"
        onClick={() => stop(false)}
        aria-label="Parar e enviar"
        title="Parar e enviar"
        className="w-8 h-8 rounded-xl bg-red-500 hover:bg-red-400 flex items-center justify-center text-white"
      >
        <Square className="w-3 h-3 fill-current" />
      </button>
    </div>
  );
}
