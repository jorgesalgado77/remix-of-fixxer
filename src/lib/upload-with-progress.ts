/**
 * Upload de arquivos para o Supabase Storage com barra de progresso real.
 * Usa `createSignedUploadUrl` + XMLHttpRequest para expor `progress`.
 */
import { supabaseExternal } from "@/lib/supabaseExternal";

export type UploadProgress = { loaded: number; total: number; percent: number };

export async function uploadWithProgress(
  bucket: string,
  path: string,
  file: File,
  onProgress?: (p: UploadProgress) => void,
  signal?: AbortSignal,
): Promise<{ path: string; publicUrl: string }> {
  // 1) Gera URL assinada de upload
  const { data: signed, error } = await supabaseExternal.storage
    .from(bucket)
    .createSignedUploadUrl(path);
  if (error || !signed) throw error ?? new Error("Falha ao gerar URL de upload");

  // 2) Envia via XHR para reportar progresso
  await new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", signed.signedUrl, true);
    xhr.setRequestHeader("Content-Type", file.type || "application/octet-stream");
    xhr.setRequestHeader("x-upsert", "false");
    xhr.upload.onprogress = (e) => {
      if (!e.lengthComputable || !onProgress) return;
      onProgress({ loaded: e.loaded, total: e.total, percent: Math.round((e.loaded / e.total) * 100) });
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) resolve();
      else reject(new Error(`Upload falhou (HTTP ${xhr.status})`));
    };
    xhr.onerror = () => reject(new Error("Erro de rede no upload"));
    xhr.onabort = () => reject(new DOMException("Aborted", "AbortError"));
    signal?.addEventListener("abort", () => xhr.abort());
    xhr.send(file);
  });

  const { data } = supabaseExternal.storage.from(bucket).getPublicUrl(path);
  return { path, publicUrl: data.publicUrl };
}
