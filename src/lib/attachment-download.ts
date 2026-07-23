/**
 * Download de anexos do bucket `media` com URL assinada e barra de progresso.
 * Respeita RLS por participante (o Storage aplica a policy no signed URL).
 */
import { supabaseExternal } from "@/lib/supabaseExternal";

export type DownloadProgress = { loaded: number; total: number; percent: number };

const BUCKET = "media";

function extractStoragePath(url: string): string | null {
  try {
    const u = new URL(url);
    // Formatos possíveis:
    // /storage/v1/object/public/media/<path>
    // /storage/v1/object/sign/media/<path>?token=...
    // /storage/v1/object/authenticated/media/<path>
    const marker = new RegExp(`/object/(?:public|sign|authenticated)/${BUCKET}/(.+)$`);
    const m = u.pathname.match(marker);
    if (m && m[1]) return decodeURIComponent(m[1]);
    return null;
  } catch {
    return null;
  }
}

export async function getSignedAttachmentUrl(publicUrl: string, expiresInSec = 60): Promise<string> {
  const path = extractStoragePath(publicUrl);
  if (!path) throw new Error("URL de anexo inválida");
  const { data, error } = await supabaseExternal.storage
    .from(BUCKET)
    .createSignedUrl(path, expiresInSec, { download: true });
  if (error || !data?.signedUrl) throw error ?? new Error("Falha ao gerar URL assinada");
  return data.signedUrl;
}

export async function downloadAttachment(
  publicUrl: string,
  filename: string,
  onProgress?: (p: DownloadProgress) => void,
  signal?: AbortSignal,
): Promise<void> {
  const signedUrl = await getSignedAttachmentUrl(publicUrl, 60);

  const blob = await new Promise<Blob>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("GET", signedUrl, true);
    xhr.responseType = "blob";
    xhr.onprogress = (e) => {
      if (!onProgress) return;
      const total = e.lengthComputable ? e.total : 0;
      const percent = total ? Math.round((e.loaded / total) * 100) : 0;
      onProgress({ loaded: e.loaded, total, percent });
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) resolve(xhr.response as Blob);
      else reject(new Error(`Download falhou (HTTP ${xhr.status})`));
    };
    xhr.onerror = () => reject(new Error("Erro de rede no download"));
    xhr.onabort = () => reject(new DOMException("Aborted", "AbortError"));
    signal?.addEventListener("abort", () => xhr.abort());
    xhr.send();
  });

  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename || "anexo";
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}
