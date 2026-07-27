import { useEffect, useRef, useState } from "react";
import { X, Camera, Video, StopCircle, RotateCcw, Check, Loader2, SwitchCamera, AlertTriangle } from "lucide-react";

type Mode = "photo" | "video";

interface Props {
  open: boolean;
  mode: Mode;
  onClose: () => void;
  onCapture: (file: File) => void;
}

export default function CameraCaptureModal({ open, mode, onClose, onCapture }: Props) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const [facing, setFacing] = useState<"environment" | "user">("environment");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [recording, setRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [preview, setPreview] = useState<{ url: string; file: File } | null>(null);
  const [validating, setValidating] = useState(false);
  const [previewMeta, setPreviewMeta] = useState<{ durationSec: number; sizeKb: number } | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const tickRef = useRef<number | null>(null);

  const stopStream = () => {
    try {
      streamRef.current?.getTracks().forEach((t) => t.stop());
    } catch {}
    streamRef.current = null;
  };

  const start = async (want: "environment" | "user") => {
    setError(null);
    setLoading(true);
    stopStream();
    try {
      const constraints: MediaStreamConstraints = {
        video: { facingMode: { ideal: want } as any, width: { ideal: 1920 }, height: { ideal: 1080 } },
        audio: mode === "video",
      };
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia(constraints);
      } catch {
        stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: mode === "video" });
      }
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => {});
      }
    } catch (e: any) {
      setError(
        e?.name === "NotAllowedError"
          ? "Permissão de câmera negada. Habilite nas configurações do navegador."
          : e?.name === "NotFoundError"
          ? "Nenhuma câmera encontrada no dispositivo."
          : "Não foi possível acessar a câmera.",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!open) return;
    setPreview(null);
    setRecording(false);
    setElapsed(0);
    start(facing);
    return () => {
      stopStream();
      if (tickRef.current) window.clearInterval(tickRef.current);
      if (recorderRef.current && recorderRef.current.state !== "inactive") {
        try { recorderRef.current.stop(); } catch {}
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, mode]);

  const switchCamera = async () => {
    const next = facing === "environment" ? "user" : "environment";
    setFacing(next);
    await start(next);
  };

  const takePhoto = () => {
    const v = videoRef.current;
    if (!v) return;
    const w = v.videoWidth || 1280;
    const h = v.videoHeight || 720;
    const canvas = document.createElement("canvas");
    canvas.width = w; canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(v, 0, 0, w, h);
    canvas.toBlob((blob) => {
      if (!blob) return;
      const file = new File([blob], `foto-${Date.now()}.jpg`, { type: "image/jpeg" });
      setPreview({ url: URL.createObjectURL(blob), file });
    }, "image/jpeg", 0.92);
  };

  /**
   * Sonda o vídeo capturado antes de permitir confirmar: garante que
   *  - o arquivo tem bytes,
   *  - o browser consegue decodificar (loadedmetadata dispara),
   *  - a duração é finita e maior que 0.
   * Se qualquer teste falha, marca previewError e bloqueia o botão de usar.
   */
  const probeVideo = (file: File, url: string) =>
    new Promise<{ ok: true; durationSec: number } | { ok: false; error: string }>((resolve) => {
      if (file.size < 1024) {
        resolve({ ok: false, error: "O clipe ficou vazio. Grave novamente." });
        return;
      }
      const v = document.createElement("video");
      v.preload = "metadata";
      v.muted = true;
      v.playsInline = true;
      let done = false;
      const finish = (r: { ok: true; durationSec: number } | { ok: false; error: string }) => {
        if (done) return;
        done = true;
        try { v.removeAttribute("src"); v.load(); } catch {}
        resolve(r);
      };
      v.onloadedmetadata = () => {
        const d = v.duration;
        if (!isFinite(d) || d <= 0.15) {
          finish({ ok: false, error: "Não foi possível ler a duração do vídeo. Grave novamente." });
        } else {
          finish({ ok: true, durationSec: d });
        }
      };
      v.onerror = () => finish({ ok: false, error: "O formato gravado não pôde ser decodificado. Tente novamente." });
      setTimeout(() => finish({ ok: false, error: "Tempo esgotado ao validar o vídeo." }), 8000);
      v.src = url;
    });

  const startRec = () => {
    const s = streamRef.current;
    if (!s) return;
    chunksRef.current = [];
    const mimeCandidates = ["video/mp4", "video/webm;codecs=vp9,opus", "video/webm;codecs=vp8,opus", "video/webm"];
    const mime = mimeCandidates.find((m) => (window as any).MediaRecorder?.isTypeSupported?.(m)) || "";
    const rec = new MediaRecorder(s, mime ? { mimeType: mime } : undefined);
    rec.ondataavailable = (e) => { if (e.data?.size) chunksRef.current.push(e.data); };
    rec.onstop = async () => {
      const type = rec.mimeType || "video/webm";
      const ext = type.includes("mp4") ? "mp4" : "webm";
      const blob = new Blob(chunksRef.current, { type });
      if (blob.size === 0) {
        setPreviewError("Nada foi gravado. Toque em gravar e tente novamente.");
        return;
      }
      const file = new File([blob], `video-${Date.now()}.${ext}`, { type });
      const url = URL.createObjectURL(blob);
      setValidating(true);
      setPreviewError(null);
      setPreviewMeta(null);
      setPreview({ url, file });
      const result = await probeVideo(file, url);
      setValidating(false);
      if (result.ok) {
        setPreviewMeta({ durationSec: result.durationSec, sizeKb: Math.round(file.size / 1024) });
      } else {
        setPreviewError(result.error);
      }
    };
    recorderRef.current = rec;
    rec.start(250);
    setRecording(true);
    setElapsed(0);
    tickRef.current = window.setInterval(() => {
      setElapsed((n) => {
        const nn = n + 1;
        if (nn >= 60) stopRec();
        return nn;
      });
    }, 1000);
  };

  const stopRec = () => {
    const rec = recorderRef.current;
    if (rec && rec.state !== "inactive") rec.stop();
    setRecording(false);
    if (tickRef.current) { window.clearInterval(tickRef.current); tickRef.current = null; }
  };

  const canConfirm = !!preview && !validating && !previewError && (mode === "photo" || !!previewMeta);

  const confirm = () => {
    if (!preview || !canConfirm) return;
    onCapture(preview.file);
    try { URL.revokeObjectURL(preview.url); } catch {}
    setPreview(null);
    setPreviewMeta(null);
    setPreviewError(null);
    onClose();
  };

  const retry = () => {
    if (preview) { try { URL.revokeObjectURL(preview.url); } catch {} }
    setPreview(null);
    setPreviewMeta(null);
    setPreviewError(null);
    setValidating(false);
  };


  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-black flex flex-col">
      <div className="flex items-center justify-between px-4 py-3 text-white">
        <button onClick={onClose} className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center" aria-label="Fechar">
          <X className="w-5 h-5" />
        </button>
        <div className="text-sm font-semibold">
          {mode === "photo" ? "Tirar foto" : recording ? `Gravando ${String(elapsed).padStart(2,"0")}s` : "Gravar vídeo"}
        </div>
        <button onClick={switchCamera} disabled={loading || recording} className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center disabled:opacity-40" aria-label="Trocar câmera">
          <SwitchCamera className="w-5 h-5" />
        </button>
      </div>

      <div className="flex-1 relative overflow-hidden bg-black">
        {!preview && (
          <video ref={videoRef} className="w-full h-full object-cover" playsInline muted autoPlay />
        )}
        {preview && mode === "photo" && (
          <img src={preview.url} className="w-full h-full object-contain" alt="Prévia" />
        )}
        {preview && mode === "video" && (
          <video src={preview.url} className="w-full h-full object-contain" controls playsInline />
        )}
        {preview && mode === "video" && validating && (
          <div className="absolute top-3 left-3 right-3 flex items-center justify-center">
            <div className="inline-flex items-center gap-2 px-3 py-2 rounded-full bg-black/70 text-white text-xs font-bold">
              <Loader2 className="w-4 h-4 animate-spin" /> Validando clipe…
            </div>
          </div>
        )}
        {preview && mode === "video" && previewMeta && !previewError && (
          <div className="absolute top-3 left-3 right-3 flex items-center justify-center pointer-events-none">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/85 text-white text-[11px] font-bold">
              <Check className="w-3.5 h-3.5" /> {previewMeta.durationSec.toFixed(1)}s · {previewMeta.sizeKb} KB
            </div>
          </div>
        )}
        {previewError && (
          <div className="absolute inset-x-0 bottom-0 p-4">
            <div className="mx-auto max-w-sm bg-red-500/25 border border-red-400/50 text-white rounded-2xl p-3 flex items-start gap-2 text-sm">
              <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
              <span>{previewError}</span>
            </div>
          </div>
        )}
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center text-white">
            <Loader2 className="w-6 h-6 animate-spin" />
          </div>
        )}
        {error && (
          <div className="absolute inset-0 flex items-center justify-center p-6 text-center text-white">
            <div className="max-w-sm bg-red-500/20 border border-red-400/40 rounded-2xl p-4 text-sm">{error}</div>
          </div>
        )}
      </div>

      <div className="px-6 py-6 bg-black flex items-center justify-center gap-6">
        {preview ? (
          <>
            <button onClick={retry} className="w-14 h-14 rounded-full bg-white/10 text-white flex items-center justify-center" aria-label="Refazer">
              <RotateCcw className="w-6 h-6" />
            </button>
            <button
              onClick={confirm}
              disabled={!canConfirm}
              className="w-16 h-16 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-lg disabled:opacity-40 disabled:cursor-not-allowed"
              aria-label="Usar"
              title={!canConfirm ? "Aguarde a validação do vídeo" : "Confirmar"}
            >
              {validating ? <Loader2 className="w-7 h-7 animate-spin" /> : <Check className="w-7 h-7" />}
            </button>
          </>
        ) : mode === "photo" ? (
          <button onClick={takePhoto} disabled={!!error || loading} className="w-20 h-20 rounded-full bg-white border-4 border-white/40 flex items-center justify-center disabled:opacity-40" aria-label="Tirar foto">
            <Camera className="w-8 h-8 text-black" />
          </button>
        ) : recording ? (
          <button onClick={stopRec} className="w-20 h-20 rounded-full bg-red-500 border-4 border-white/40 flex items-center justify-center animate-pulse" aria-label="Parar gravação">
            <StopCircle className="w-9 h-9 text-white" />
          </button>
        ) : (
          <button onClick={startRec} disabled={!!error || loading} className="w-20 h-20 rounded-full bg-red-500 border-4 border-white/40 flex items-center justify-center disabled:opacity-40" aria-label="Iniciar gravação">
            <Video className="w-8 h-8 text-white" />
          </button>
        )}
      </div>
    </div>
  );
}
