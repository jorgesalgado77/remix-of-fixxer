/**
 * Helpers para documentos privados do perfil.
 *
 * Regra: NOVOS uploads de documentos vão para o bucket PRIVADO
 * `documents-private` (nunca mais `media/documents/`). Persistimos
 * apenas o `path` (relativo ao bucket) — a URL é gerada sob demanda
 * via `createSignedUrl`.
 *
 * Cache + retry: `resolveDocumentUrl` mantém as signed URLs em memória
 * até 5min antes do vencimento e reaproveita a mesma promise concorrente
 * para o mesmo path (evita rajadas). Em falha, tenta novamente com backoff
 * exponencial até 3x antes de devolver "".
 */
import { supabaseExternal } from "@/lib/supabaseExternal";

export const DOCUMENTS_BUCKET = "documents-private";

export type ProfileDocument = {
  name: string;
  type: "document";
  path?: string;            // novo formato (privado)
  url?: string;             // legado (público) — mantido só p/ compat
  size?: string;
  created_at?: string;
};

type CacheEntry = { url: string; expiresAt: number };
const urlCache = new Map<string, CacheEntry>();
const inflight = new Map<string, Promise<string>>();
const SAFETY_MARGIN_MS = 5 * 60 * 1000; // renova 5min antes de expirar

export async function uploadProfileDocument(
  file: File,
  profileId: string,
): Promise<ProfileDocument> {
  const safe = file.name.replace(/[^\w.\-]+/g, "_");
  const path = `${profileId}/${Date.now()}_${Math.random().toString(36).slice(2, 6)}_${safe}`;
  const { error } = await supabaseExternal.storage
    .from(DOCUMENTS_BUCKET)
    .upload(path, file, {
      upsert: false,
      contentType: file.type || "application/octet-stream",
    });
  if (error) throw error;
  return {
    name: file.name,
    type: "document",
    path,
    size: `${(file.size / (1024 * 1024)).toFixed(2)} MB`,
    created_at: new Date().toISOString(),
  };
}

async function signWithRetry(path: string, expiresInSec: number): Promise<string> {
  let lastErr: unknown = null;
  for (let attempt = 0; attempt < 3; attempt++) {
    const { data, error } = await supabaseExternal.storage
      .from(DOCUMENTS_BUCKET)
      .createSignedUrl(path, expiresInSec);
    if (!error && data?.signedUrl) return data.signedUrl;
    lastErr = error;
    // backoff: 250ms, 750ms
    await new Promise((r) => setTimeout(r, 250 * Math.pow(3, attempt)));
  }
  if (lastErr) console.warn("[profile-documents] signed URL falhou:", lastErr);
  return "";
}

/**
 * Resolve o item para uma URL utilizável.
 * - URL http(s) legada: retorna igual.
 * - path privado: usa cache; se ausente/expirado, faz signed URL com retry.
 */
export async function resolveDocumentUrl(
  pathOrUrl: string | null | undefined,
  expiresInSec = 3600,
): Promise<string> {
  if (!pathOrUrl) return "";
  if (/^https?:\/\//i.test(pathOrUrl)) return pathOrUrl;

  const now = Date.now();
  const cached = urlCache.get(pathOrUrl);
  if (cached && cached.expiresAt - SAFETY_MARGIN_MS > now) return cached.url;

  const existing = inflight.get(pathOrUrl);
  if (existing) return existing;

  const p = (async () => {
    const url = await signWithRetry(pathOrUrl, expiresInSec);
    if (url) urlCache.set(pathOrUrl, { url, expiresAt: now + expiresInSec * 1000 });
    return url;
  })().finally(() => inflight.delete(pathOrUrl));

  inflight.set(pathOrUrl, p);
  return p;
}

/** Invalida entrada de cache (chame após deletar/reupload). */
export function invalidateDocumentUrl(pathOrUrl?: string | null) {
  if (!pathOrUrl) { urlCache.clear(); return; }
  urlCache.delete(pathOrUrl);
}

export async function deleteProfileDocument(doc: ProfileDocument): Promise<void> {
  if (!doc?.path) return;
  invalidateDocumentUrl(doc.path);
  await supabaseExternal.storage.from(DOCUMENTS_BUCKET).remove([doc.path]);
}
