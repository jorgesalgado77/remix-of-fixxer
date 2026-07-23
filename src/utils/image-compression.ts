/**
 * Processamento de imagens no browser com suporte a AVIF, PNG, WEBP, JPEG e GIF.
 * - Preserva formato original quando faz sentido (PNG mantém transparência).
 * - Redimensiona respeitando proporção.
 * - Gera thumbnails WEBP para grids/prévias.
 * - Retorna Content-Type correto para salvar no Storage.
 */
import { mimeToExt, resolveImageMime } from '@/utils/image-validation';

export interface ProcessedImage {
  file: File;
  mime: string;
  ext: string;
  width: number;
  height: number;
}

const OUTPUT_MIME_MAP: Record<string, string> = {
  'image/jpeg': 'image/jpeg',
  'image/png': 'image/png',
  'image/webp': 'image/webp',
  'image/avif': 'image/avif',
  'image/gif': 'image/webp', // GIF estático vira WEBP menor
};

async function loadBitmap(file: File): Promise<{ bitmap: ImageBitmap; width: number; height: number }> {
  // createImageBitmap é o caminho mais rápido e suporta AVIF/WEBP nativamente.
  try {
    const bitmap = await createImageBitmap(file);
    return { bitmap, width: bitmap.width, height: bitmap.height };
  } catch {
    // Fallback via <img> (ex.: navegadores mais antigos com AVIF)
    const url = URL.createObjectURL(file);
    try {
      const img = await new Promise<HTMLImageElement>((resolve, reject) => {
        const el = new Image();
        el.onload = () => resolve(el);
        el.onerror = () => reject(new Error('Não foi possível decodificar a imagem'));
        el.src = url;
      });
      const bitmap = await createImageBitmap(img);
      return { bitmap, width: img.naturalWidth, height: img.naturalHeight };
    } finally {
      URL.revokeObjectURL(url);
    }
  }
}

async function canvasToBlob(
  canvas: HTMLCanvasElement,
  mime: string,
  quality: number,
): Promise<Blob> {
  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob((b) => resolve(b), mime, quality),
  );
  if (blob && blob.type === mime) return blob;
  // Alguns browsers não codificam AVIF no canvas — cai para WEBP.
  if (!blob || (mime === 'image/avif' && blob.type !== 'image/avif')) {
    const fallback = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob((b) => resolve(b), 'image/webp', quality),
    );
    if (fallback) return fallback;
  }
  if (blob) return blob;
  throw new Error('Falha ao codificar imagem');
}

function renameWithExt(originalName: string, ext: string): string {
  const base = originalName.replace(/\.[^.]+$/, '') || 'imagem';
  return `${base}.${ext}`;
}

export async function processImage(
  file: File,
  opts: { maxWidth?: number; quality?: number } = {},
): Promise<ProcessedImage> {
  const { maxWidth = 1600, quality = 0.82 } = opts;
  const inputMime = resolveImageMime(file) || 'image/jpeg';
  const targetMime = OUTPUT_MIME_MAP[inputMime] || 'image/jpeg';

  const { bitmap, width, height } = await loadBitmap(file);

  const scale = width > maxWidth ? maxWidth / width : 1;
  const outW = Math.max(1, Math.round(width * scale));
  const outH = Math.max(1, Math.round(height * scale));

  // Se a imagem já é pequena E é AVIF (que pode falhar ao re-codificar),
  // preserva o arquivo original com Content-Type correto.
  if (scale === 1 && inputMime === 'image/avif') {
    bitmap.close?.();
    const renamed = new File([file], renameWithExt(file.name, 'avif'), {
      type: 'image/avif',
      lastModified: file.lastModified,
    });
    return { file: renamed, mime: 'image/avif', ext: 'avif', width, height };
  }

  const canvas = document.createElement('canvas');
  canvas.width = outW;
  canvas.height = outH;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas indisponível');
  ctx.drawImage(bitmap, 0, 0, outW, outH);
  bitmap.close?.();

  const blob = await canvasToBlob(canvas, targetMime, quality);
  const finalMime = blob.type || targetMime;
  const ext = mimeToExt(finalMime);
  const outFile = new File([blob], renameWithExt(file.name, ext), {
    type: finalMime,
    lastModified: Date.now(),
  });
  return { file: outFile, mime: finalMime, ext, width: outW, height: outH };
}

/** Thumbnail sempre em WEBP (leve e amplamente suportado). */
export async function generateThumbnail(
  file: File,
  size = 320,
  quality = 0.72,
): Promise<ProcessedImage> {
  const { bitmap, width, height } = await loadBitmap(file);
  const scale = Math.min(1, size / Math.max(width, height));
  const outW = Math.max(1, Math.round(width * scale));
  const outH = Math.max(1, Math.round(height * scale));

  const canvas = document.createElement('canvas');
  canvas.width = outW;
  canvas.height = outH;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas indisponível');
  ctx.drawImage(bitmap, 0, 0, outW, outH);
  bitmap.close?.();

  const blob = await canvasToBlob(canvas, 'image/webp', quality);
  const finalMime = blob.type || 'image/webp';
  const ext = mimeToExt(finalMime);
  const thumbFile = new File(
    [blob],
    `${(file.name || 'imagem').replace(/\.[^.]+$/, '')}.thumb.${ext}`,
    { type: finalMime, lastModified: Date.now() },
  );
  return { file: thumbFile, mime: finalMime, ext, width: outW, height: outH };
}

/**
 * Wrapper retrocompatível — usado por telas que ainda importam `compressImage`.
 * Retorna diretamente um File processado.
 */
export async function compressImage(
  file: File,
  maxWidth = 1200,
  quality = 0.8,
): Promise<File> {
  const out = await processImage(file, { maxWidth, quality });
  return out.file;
}
