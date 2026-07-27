/**
 * Upload com re-tentativa automática em falha de rede.
 * Preserva o percentual atingido para a UI (usa `onProgress` do XHR base).
 * Backoff exponencial: 1s, 2s, 4s, 8s (cap 8s), até `maxAttempts` (default 5).
 * Aborta se offline e aguarda o evento `online` para retentar imediatamente.
 */
import { uploadWithProgress, type UploadProgress } from "@/lib/upload-with-progress";

export type ResumableUploadEvent =
  | { kind: "progress"; percent: number; attempt: number }
  | { kind: "retry"; attempt: number; nextDelayMs: number; reason: string }
  | { kind: "waiting-online" }
  | { kind: "done"; publicUrl: string; attempts: number };

export type ResumableUploadOptions = {
  maxAttempts?: number;
  onEvent?: (e: ResumableUploadEvent) => void;
  signal?: AbortSignal;
};

const isNetworkError = (err: unknown) => {
  const msg = String((err as any)?.message ?? err ?? "");
  return (
    /network|failed to fetch|timeout|erro de rede|offline|net::/i.test(msg) ||
    (err as any)?.name === "TypeError"
  );
};

const waitOnline = (signal?: AbortSignal) =>
  new Promise<void>((resolve) => {
    if (typeof navigator === "undefined" || navigator.onLine) return resolve();
    const on = () => { window.removeEventListener("online", on); resolve(); };
    window.addEventListener("online", on);
    signal?.addEventListener("abort", () => { window.removeEventListener("online", on); resolve(); });
  });

const sleep = (ms: number, signal?: AbortSignal) =>
  new Promise<void>((resolve) => {
    const t = setTimeout(resolve, ms);
    signal?.addEventListener("abort", () => { clearTimeout(t); resolve(); });
  });

export async function uploadWithRetry(
  bucket: string,
  path: string,
  file: File,
  opts: ResumableUploadOptions = {},
): Promise<{ publicUrl: string; attempts: number }> {
  const max = opts.maxAttempts ?? 5;
  let attempt = 0;
  let lastErr: unknown = null;
  while (attempt < max) {
    attempt++;
    if (opts.signal?.aborted) throw new DOMException("Aborted", "AbortError");
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      opts.onEvent?.({ kind: "waiting-online" });
      await waitOnline(opts.signal);
    }
    try {
      const res = await uploadWithProgress(
        bucket,
        path,
        file,
        (p: UploadProgress) => opts.onEvent?.({ kind: "progress", percent: p.percent, attempt }),
        opts.signal,
      );
      opts.onEvent?.({ kind: "done", publicUrl: res.publicUrl, attempts: attempt });
      return { publicUrl: res.publicUrl, attempts: attempt };
    } catch (e) {
      lastErr = e;
      if ((e as any)?.name === "AbortError") throw e;
      if (!isNetworkError(e) || attempt >= max) throw e;
      const delay = Math.min(8000, 1000 * 2 ** (attempt - 1));
      opts.onEvent?.({
        kind: "retry",
        attempt,
        nextDelayMs: delay,
        reason: String((e as any)?.message ?? e),
      });
      await sleep(delay, opts.signal);
    }
  }
  throw lastErr ?? new Error("Upload falhou após várias tentativas");
}
