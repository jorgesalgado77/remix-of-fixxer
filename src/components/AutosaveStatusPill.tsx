import { useEffect, useState } from "react";
import { Loader2, Check, CloudUpload, AlertCircle } from "lucide-react";

interface Props {
  saving: boolean;
  autoSaving: boolean;
  lastSavedAt: number | null;
  isDirty: boolean;
}

function formatSince(ts: number): string {
  const diff = Math.max(0, Math.floor((Date.now() - ts) / 1000));
  if (diff < 5) return "agora";
  if (diff < 60) return `há ${diff}s`;
  const m = Math.floor(diff / 60);
  if (m < 60) return `há ${m} min`;
  const h = Math.floor(m / 60);
  return `há ${h}h`;
}

/**
 * Pílula flutuante de status de autosave, visível em toda a página do perfil.
 * Reflete: Salvando..., Alterações pendentes, Salvo (com relógio relativo).
 */
export function AutosaveStatusPill({ saving, autoSaving, lastSavedAt, isDirty }: Props) {
  const [, tick] = useState(0);

  // Atualiza o "há Xs" a cada 15s
  useEffect(() => {
    const id = setInterval(() => tick((n) => n + 1), 15000);
    return () => clearInterval(id);
  }, []);

  const busy = saving || autoSaving;
  const label = busy
    ? "Salvando..."
    : isDirty
      ? "Alterações pendentes"
      : lastSavedAt
        ? `Salvo ${formatSince(lastSavedAt)}`
        : "Autosave ativo";

  const state: "busy" | "dirty" | "saved" | "idle" = busy
    ? "busy"
    : isDirty
      ? "dirty"
      : lastSavedAt
        ? "saved"
        : "idle";

  const colorMap = {
    busy: "border-primary/50 bg-primary/15 text-primary",
    dirty: "border-amber-500/50 bg-amber-500/15 text-amber-300",
    saved: "border-emerald-500/50 bg-emerald-500/15 text-emerald-300",
    idle: "border-white/15 bg-white/5 text-white/70",
  } as const;

  const Icon =
    state === "busy" ? Loader2 : state === "dirty" ? AlertCircle : state === "saved" ? Check : CloudUpload;

  return (
    <div
      className="fixed top-3 right-3 z-50 pointer-events-none"
      role="status"
      aria-live="polite"
      aria-atomic="true"
    >
      <div
        className={`pointer-events-auto inline-flex items-center gap-2 rounded-full border backdrop-blur-md px-3 py-1.5 text-[10px] font-black uppercase tracking-widest shadow-lg transition-all ${colorMap[state]}`}
      >
        <Icon className={`w-3.5 h-3.5 ${state === "busy" ? "animate-spin" : ""}`} aria-hidden />
        <span>{label}</span>
      </div>
    </div>
  );
}
