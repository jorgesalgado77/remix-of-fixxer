/**
 * Validação central de imagens (AVIF, PNG, WEBP, JPEG, GIF).
 * Reconhece extensões digitadas incorretamente e sugere a correta.
 */
export const ALLOWED_IMAGE_MIME = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/avif',
  'image/gif',
] as const;

export const EXT_TO_MIME: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  jpe: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  avif: 'image/avif',
  gif: 'image/gif',
};

/** Typos comuns → extensão correta (para mensagens amigáveis) */
const TYPO_TO_EXT: Record<string, string> = {
  wepp: 'webp',
  webbp: 'webp',
  wbep: 'webp',
  jpge: 'jpeg',
  jpgg: 'jpg',
  jppg: 'jpg',
  pnng: 'png',
  pnnnn: 'png',
  pnq: 'png',
  avfi: 'avif',
  aviff: 'avif',
  giff: 'gif',
};

export function getFileExt(name: string): string {
  const m = name.toLowerCase().match(/\.([a-z0-9]+)$/);
  return m ? m[1] : '';
}

/**
 * Retorna o MIME real do arquivo: usa file.type quando disponível;
 * caso contrário deduz pela extensão (útil para AVIF em navegadores antigos).
 */
export function resolveImageMime(file: File): string | null {
  const t = (file.type || '').toLowerCase();
  if (t.startsWith('image/')) return t;
  const ext = getFileExt(file.name);
  if (EXT_TO_MIME[ext]) return EXT_TO_MIME[ext];
  return null;
}

export type ImageValidation =
  | { ok: true; mime: string; ext: string }
  | { ok: false; error: string };

export function validateImage(file: File, maxBytes = 5 * 1024 * 1024): ImageValidation {
  const ext = getFileExt(file.name);

  // Extensão claramente digitada errada
  if (ext && TYPO_TO_EXT[ext]) {
    const suggestion = TYPO_TO_EXT[ext];
    return {
      ok: false,
      error: `Extensão ".${ext}" não é reconhecida. Você quis dizer ".${suggestion}"? Formatos aceitos: JPG, PNG, WEBP, AVIF, GIF.`,
    };
  }

  const mime = resolveImageMime(file);
  if (!mime || !(ALLOWED_IMAGE_MIME as readonly string[]).includes(mime)) {
    return {
      ok: false,
      error: `Formato de "${file.name}" não é suportado. Envie JPG, PNG, WEBP, AVIF ou GIF.`,
    };
  }

  if (file.size > maxBytes) {
    const mb = (maxBytes / (1024 * 1024)).toFixed(0);
    return {
      ok: false,
      error: `"${file.name}" excede o limite de ${mb}MB.`,
    };
  }

  return { ok: true, mime, ext: ext || mime.split('/')[1] };
}

export function mimeToExt(mime: string): string {
  const found = Object.entries(EXT_TO_MIME).find(([, m]) => m === mime);
  return found ? found[0] : 'bin';
}
