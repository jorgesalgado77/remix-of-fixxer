/**
 * Helpers para documentos privados do perfil.
 *
 * Regra: NOVOS uploads de documentos vão para o bucket PRIVADO
 * `documents-private` (nunca mais `media/documents/`). Persistimos
 * apenas o `path` (relativo ao bucket) — a URL é gerada sob demanda
 * via `createSignedUrl`.
 *
 * Compatibilidade: entradas legadas guardadas como `{ url: "https://…public/media/…" }`
 * continuam funcionando. `resolveDocumentUrl` devolve a própria URL quando
 * recebe algo que já é absoluto (http/https), então o render antigo não quebra
 * até rodar o script de migração.
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

/**
 * Faz upload em `documents-private/<profileId>/<timestamp>_<sanitized>` e
 * devolve o metadata pronto para persistir em `profiles.documents`.
 */
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

/**
 * Resolve o item para uma URL utilizável no <img>/<a>/<embed>.
 * - se receber URL http(s), devolve igual (legado);
 * - se receber path do bucket privado, gera signed URL válida por `expiresInSec`.
 * Retorna string vazia em caso de erro (o consumidor pode exibir placeholder).
 */
export async function resolveDocumentUrl(
  pathOrUrl: string | null | undefined,
  expiresInSec = 3600,
): Promise<string> {
  if (!pathOrUrl) return "";
  if (/^https?:\/\//i.test(pathOrUrl)) return pathOrUrl;
  const { data, error } = await supabaseExternal.storage
    .from(DOCUMENTS_BUCKET)
    .createSignedUrl(pathOrUrl, expiresInSec);
  if (error || !data?.signedUrl) return "";
  return data.signedUrl;
}

/**
 * Remove o objeto do bucket privado (best-effort). Ignora legados
 * (que estão no bucket público `media`) — esses são apagados pelo
 * script de migração se rodado com `--purge`.
 */
export async function deleteProfileDocument(doc: ProfileDocument): Promise<void> {
  if (!doc?.path) return;
  await supabaseExternal.storage.from(DOCUMENTS_BUCKET).remove([doc.path]);
}
