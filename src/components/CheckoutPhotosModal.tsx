import { useRef, useState } from "react";
import { X, Camera, Loader2, ImagePlus, Trash2, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { useMediaUpload } from "@/hooks/use-media-upload";

type Props = {
  open: boolean;
  onClose: () => void;
  appointmentId: string;
  /** Título/subtítulo do serviço (opcional, apenas visual). */
  serviceTitle?: string;
  /**
   * Executor: recebe as URLs finais das fotos após upload e deve chamar checkIn/checkOut.
   * Deve lançar em caso de erro.
   */
  onConfirm: (photoUrls: string[]) => Promise<void>;
  mode?: "checkin" | "checkout";
  /** Quantas fotos são obrigatórias antes de habilitar o botão. */
  minPhotos?: number;
  maxPhotos?: number;
};

const ACCEPTED = "image/jpeg,image/png,image/webp,image/heic,image/heif";
const MAX_FILE_MB = 12;

export function CheckoutPhotosModal({
  open,
  onClose,
  appointmentId,
  serviceTitle,
  onConfirm,
  mode = "checkout",
  minPhotos = 1,
  maxPhotos = 8,
}: Props) {
  const [files, setFiles] = useState<Array<{ file: File; preview: string }>>([]);
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const { uploadFileDetailed, uploadProgress } = useMediaUpload();

  if (!open) return null;

  const isCheckin = mode === "checkin";
  const themeColor = isCheckin ? "#A855F7" : "#FFD600";
  const titleLabel = isCheckin ? "Check-in" : "Check-out";
  const description = isCheckin
    ? "Registre fotos do local de chegada (opcional) para confirmar a presença."
    : "Registre fotos do serviço concluído — obrigatório para liberar a custódia.";

  const addFiles = (list: FileList | null) => {
    if (!list) return;
    const remaining = maxPhotos - files.length;
    const chosen = Array.from(list).slice(0, remaining);
    const errors: string[] = [];
    const next = chosen
      .filter((f) => {
        if (!f.type.startsWith("image/")) {
          errors.push(`${f.name}: apenas imagens.`);
          return false;
        }
        if (f.size > MAX_FILE_MB * 1024 * 1024) {
          errors.push(`${f.name}: acima de ${MAX_FILE_MB}MB.`);
          return false;
        }
        return true;
      })
      .map((file) => ({ file, preview: URL.createObjectURL(file) }));
    if (errors.length) toast.error("Alguns arquivos foram ignorados", { description: errors.join(" · ") });
    if (next.length) setFiles((prev) => [...prev, ...next]);
    if (inputRef.current) inputRef.current.value = "";
  };

  const removeAt = (i: number) => {
    setFiles((prev) => {
      const copy = [...prev];
      const [gone] = copy.splice(i, 1);
      if (gone) URL.revokeObjectURL(gone.preview);
      return copy;
    });
  };

  const enoughPhotos = files.length >= (isCheckin ? 0 : minPhotos);

  const submit = async () => {
    if (!enoughPhotos) {
      toast.error(`Envie pelo menos ${minPhotos} foto(s) do serviço concluído.`);
      return;
    }
    setBusy(true);
    try {
      const urls: string[] = [];
      for (const item of files) {
        const res = await uploadFileDetailed(item.file, {
          bucket: "media",
          folder: `appointments/${appointmentId}/${mode}`,
          retries: 2,
          generateThumb: true,
        });
        if (res?.url) urls.push(res.url);
      }
      if (files.length > 0 && urls.length === 0) {
        throw new Error("Nenhuma foto pôde ser enviada.");
      }
      await onConfirm(urls);
      // limpa previews locais
      files.forEach((f) => URL.revokeObjectURL(f.preview));
      setFiles([]);
      onClose();
    } catch (e: any) {
      toast.error(`Falha ao concluir ${titleLabel}`, { description: e?.message });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[110] bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center"
      onClick={() => !busy && onClose()}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full sm:max-w-lg bg-[#0A0A0B] border border-white/10 rounded-t-3xl sm:rounded-3xl flex flex-col max-h-[100dvh] sm:max-h-[92vh]"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        {/* Header */}
        <div className="shrink-0 flex items-center justify-between p-4 border-b border-white/10">
          <div className="flex items-center gap-2 min-w-0">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
              style={{ backgroundColor: `${themeColor}22`, color: themeColor }}
            >
              <Camera className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h2 className="text-sm font-black uppercase tracking-tight truncate">
                {isCheckin ? "📍" : "🏁"} {titleLabel} do Serviço
              </h2>
              {serviceTitle && (
                <p className="text-[10px] text-white/50 truncate">{serviceTitle}</p>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={busy}
            className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center disabled:opacity-40"
            aria-label="Fechar"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          <p className="text-[12px] text-white/70 leading-relaxed">{description}</p>

          {!isCheckin && (
            <div
              className="flex items-start gap-2 p-3 rounded-xl border"
              style={{
                backgroundColor: `${themeColor}11`,
                borderColor: `${themeColor}44`,
              }}
            >
              <ShieldCheck className="w-4 h-4 shrink-0 mt-0.5" style={{ color: themeColor }} />
              <p className="text-[11px] text-white/80 leading-snug">
                Ao confirmar, a <b>custódia</b> do sinal será liberada automaticamente ao prestador
                autorizado. As fotos ficam anexadas ao histórico da O.S.
              </p>
            </div>
          )}

          {/* Grid de previews */}
          {files.length > 0 && (
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
              {files.map((f, i) => {
                const p = uploadProgress.find((up) => up.fileName === f.file.name);
                return (
                  <div
                    key={i}
                    className="relative aspect-square rounded-xl overflow-hidden border border-white/10 bg-black/40"
                  >
                    <img
                      src={f.preview}
                      alt={`foto ${i + 1}`}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                    {p && p.progress < 100 && !p.error && (
                      <div className="absolute inset-x-0 bottom-0 bg-black/70 px-1.5 py-1">
                        <div className="h-1 rounded bg-white/10 overflow-hidden">
                          <div
                            className="h-full transition-all"
                            style={{ width: `${p.progress}%`, backgroundColor: themeColor }}
                          />
                        </div>
                      </div>
                    )}
                    <button
                      onClick={() => removeAt(i)}
                      disabled={busy}
                      className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/70 border border-white/10 flex items-center justify-center text-white/90 disabled:opacity-40"
                      aria-label={`Remover foto ${i + 1}`}
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {/* Botão de adicionar (mobile: câmera direta / escolher da galeria) */}
          {files.length < maxPhotos && (
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => {
                  const el = inputRef.current;
                  if (!el) return;
                  el.setAttribute("capture", "environment");
                  el.click();
                }}
                disabled={busy}
                className="flex flex-col items-center justify-center gap-1 py-4 rounded-xl border-2 border-dashed border-white/15 text-white/70 hover:border-white/30 hover:text-white transition-all disabled:opacity-40"
              >
                <Camera className="w-5 h-5" />
                <span className="text-[10px] font-black uppercase tracking-widest">Câmera</span>
              </button>
              <button
                onClick={() => {
                  const el = inputRef.current;
                  if (!el) return;
                  el.removeAttribute("capture");
                  el.click();
                }}
                disabled={busy}
                className="flex flex-col items-center justify-center gap-1 py-4 rounded-xl border-2 border-dashed border-white/15 text-white/70 hover:border-white/30 hover:text-white transition-all disabled:opacity-40"
              >
                <ImagePlus className="w-5 h-5" />
                <span className="text-[10px] font-black uppercase tracking-widest">Galeria</span>
              </button>
            </div>
          )}

          <input
            ref={inputRef}
            type="file"
            accept={ACCEPTED}
            multiple
            hidden
            onChange={(e) => addFiles(e.target.files)}
          />

          <p className="text-[10px] text-white/40 text-center">
            {files.length}/{maxPhotos} foto(s) · Máx {MAX_FILE_MB}MB por arquivo · JPG, PNG, WEBP
          </p>
        </div>

        {/* Footer */}
        <div className="shrink-0 p-4 border-t border-white/10 flex gap-2">
          <button
            onClick={onClose}
            disabled={busy}
            className="flex-1 py-3 rounded-xl bg-white/5 border border-white/10 text-[11px] font-black uppercase tracking-widest text-white/70 disabled:opacity-40"
          >
            Cancelar
          </button>
          <button
            onClick={submit}
            disabled={busy || !enoughPhotos}
            className="flex-[2] py-3 rounded-xl text-[11px] font-black uppercase tracking-widest flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
            style={{ backgroundColor: themeColor, color: "#000" }}
          >
            {busy ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" /> Enviando…
              </>
            ) : (
              <>
                <ShieldCheck className="w-4 h-4" /> Confirmar {titleLabel}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
