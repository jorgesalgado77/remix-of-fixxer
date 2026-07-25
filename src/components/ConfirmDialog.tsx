import { useEffect, useRef } from "react";
import { AlertTriangle, X } from "lucide-react";

interface Props {
  open: boolean;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * Modal genérico de confirmação (acessível).
 * ESC fecha, foco inicial no botão de confirmar.
 */
export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = "Confirmar",
  cancelLabel = "Cancelar",
  destructive,
  onConfirm,
  onCancel,
}: Props) {
  const confirmRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
      if (e.key === "Enter") onConfirm();
    };
    document.addEventListener("keydown", onKey);
    const t = setTimeout(() => confirmRef.current?.focus(), 30);
    return () => {
      document.removeEventListener("keydown", onKey);
      clearTimeout(t);
    };
  }, [open, onCancel, onConfirm]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-title"
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-150"
      onClick={onCancel}
    >
      <div
        className="w-full max-w-sm rounded-2xl border border-white/10 bg-[#111114] p-5 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
            style={{
              background: destructive ? "rgba(239,68,68,0.12)" : "rgba(0,229,255,0.12)",
              color: destructive ? "#ef4444" : "#00E5FF",
              border: destructive ? "1px solid rgba(239,68,68,0.35)" : "1px solid rgba(0,229,255,0.35)",
            }}
            aria-hidden="true"
          >
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 id="confirm-title" className="text-sm font-black uppercase italic tracking-wide text-white">
              {title}
            </h2>
            {description && (
              <p className="mt-1 text-[11px] leading-snug text-white/70">{description}</p>
            )}
          </div>
          <button
            type="button"
            onClick={onCancel}
            aria-label="Fechar"
            className="w-8 h-8 rounded-lg flex items-center justify-center text-white/50 hover:text-white hover:bg-white/5"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="mt-5 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="h-10 px-4 rounded-xl bg-white/5 border border-white/10 text-[11px] font-black uppercase italic text-white/80 hover:bg-white/10"
          >
            {cancelLabel}
          </button>
          <button
            ref={confirmRef}
            type="button"
            onClick={onConfirm}
            className={`h-10 px-4 rounded-xl text-[11px] font-black uppercase italic ${
              destructive
                ? "bg-red-500 text-white hover:bg-red-600"
                : "bg-primary text-black hover:brightness-110"
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
