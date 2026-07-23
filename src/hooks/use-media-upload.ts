import { useRef, useState } from 'react';
import { supabaseExternal } from '@/lib/supabaseExternal';
import { toast } from 'sonner';
import { generateThumbnail } from '@/utils/image-compression';

export interface UploadProgress {
  fileName: string;
  progress: number;
  error?: boolean;
}

export interface UploadResult {
  url: string;
  thumbUrl?: string;
  path: string;
  contentType: string;
}

interface UploadOptions {
  bucket?: string;
  folder?: string;
  retries?: number;
  contentType?: string;
  generateThumb?: boolean;
}

async function putWithProgress(
  signedUrl: string,
  file: File,
  contentType: string,
  onProgress: (percent: number) => void,
): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('PUT', signedUrl, true);
    xhr.setRequestHeader('Content-Type', contentType);
    xhr.setRequestHeader('x-upsert', 'false');
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100));
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) resolve();
      else reject(new Error(`HTTP ${xhr.status} ${xhr.statusText || ''}`.trim()));
    };
    xhr.onerror = () => reject(new Error('Erro de rede no upload'));
    xhr.send(file);
  });
}

export function useMediaUpload() {
  const [uploadProgress, setUploadProgress] = useState<UploadProgress[]>([]);
  const activeCountRef = useRef(0);
  const [isUploading, setIsUploading] = useState(false);

  const bumpActive = (delta: number) => {
    activeCountRef.current = Math.max(0, activeCountRef.current + delta);
    setIsUploading(activeCountRef.current > 0);
  };

  const updateProgress = (fileName: string, patch: Partial<UploadProgress>) => {
    setUploadProgress(prev => {
      const exists = prev.some(p => p.fileName === fileName);
      if (!exists) return [...prev, { fileName, progress: 0, ...patch }];
      return prev.map(p => p.fileName === fileName ? { ...p, ...patch } : p);
    });
  };

  const scheduleCleanup = (fileName: string, delay = 1500) => {
    setTimeout(() => {
      setUploadProgress(prev => prev.filter(p => p.fileName !== fileName));
    }, delay);
  };

  const humanizeError = (raw: string, status: any, bucket: string): string => {
    const isBucketMissing = /bucket not found/i.test(raw) || String(status) === '404';
    const isForbidden = String(status) === '403' || /row-level security|not authorized|unauthorized/i.test(raw);
    const isTooLarge = /payload too large|maximum allowed size|too large/i.test(raw) || String(status) === '413';
    const isDuplicate = /already exists|duplicate/i.test(raw) || String(status) === '409';
    if (isBucketMissing) return `Bucket "${bucket}" não existe. Rode o SQL de setup.`;
    if (isForbidden) return 'Sem permissão. Faça login novamente ou revise as policies.';
    if (isTooLarge) return 'Arquivo maior que o limite do bucket.';
    if (isDuplicate) return 'Arquivo duplicado.';
    return raw || 'Erro desconhecido';
  };

  const uploadOne = async (
    file: File,
    bucket: string,
    filePath: string,
    contentType: string,
    displayName: string,
    retries: number,
  ): Promise<string> => {
    let attempt = 0;
    let lastErr: any = null;
    while (attempt < retries) {
      try {
        const { data: signed, error } = await supabaseExternal.storage
          .from(bucket)
          .createSignedUploadUrl(filePath);
        if (error || !signed) throw error ?? new Error('Falha ao gerar URL de upload');
        await putWithProgress(signed.signedUrl, file, contentType, (p) =>
          updateProgress(displayName, { progress: Math.max(5, p) }),
        );
        const { data: pub } = supabaseExternal.storage.from(bucket).getPublicUrl(filePath);
        return pub.publicUrl;
      } catch (err: any) {
        lastErr = err;
        attempt++;
        if (attempt >= retries) throw err;
        await new Promise(r => setTimeout(r, 600 * attempt));
      }
    }
    throw lastErr ?? new Error('Falha no upload');
  };

  const uploadFileDetailed = async (
    file: File,
    options: UploadOptions = {},
  ): Promise<UploadResult | null> => {
    const { bucket = 'media', folder = 'general', retries = 2, contentType, generateThumb = false } = options;
    const displayName = file.name;
    const safeName = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}_${file.name.replace(/[^\w.\-]+/g, '_')}`;
    const filePath = `${folder}/${safeName}`;
    const mainType = contentType || file.type || 'application/octet-stream';

    bumpActive(+1);
    updateProgress(displayName, { progress: 5 });

    try {
      const url = await uploadOne(file, bucket, filePath, mainType, displayName, retries);
      let thumbUrl: string | undefined;

      if (generateThumb && mainType.startsWith('image/')) {
        try {
          const thumb = await generateThumbnail(file, 400, 0.72);
          const thumbPath = `${folder}/thumbs/${safeName.replace(/\.[^.]+$/, '')}.webp`;
          thumbUrl = await uploadOne(
            thumb.file,
            bucket,
            thumbPath,
            thumb.mime,
            `${displayName} (thumb)`,
            1,
          );
        } catch (thumbErr) {
          console.warn('[upload] falha ao gerar thumbnail (ignorado):', thumbErr);
        }
      }

      updateProgress(displayName, { progress: 100 });
      scheduleCleanup(displayName, 1200);
      return { url, thumbUrl, path: filePath, contentType: mainType };
    } catch (err: any) {
      const raw = err?.message || err?.error || err?.statusText || '';
      const status = err?.status || err?.statusCode;
      const msg = humanizeError(String(raw), status, bucket);
      console.error('[upload] falhou', { status, raw, err });
      updateProgress(displayName, { error: true, progress: 100 });
      toast.error(`Falha no upload: ${displayName}`, { description: msg });
      scheduleCleanup(displayName, 3000);
      return null;
    } finally {
      bumpActive(-1);
    }
  };

  /** Compatível com o uso antigo (string | null). */
  const uploadFile = async (
    file: File,
    bucket: string = 'media',
    folder: string = 'general',
    retries: number = 2,
  ): Promise<string | null> => {
    const res = await uploadFileDetailed(file, { bucket, folder, retries });
    return res?.url ?? null;
  };

  return { uploadFile, uploadFileDetailed, isUploading, uploadProgress };
}
