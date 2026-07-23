import { useRef, useState } from 'react';
import { supabaseExternal } from '@/lib/supabaseExternal';
import { toast } from 'sonner';

export interface UploadProgress {
  fileName: string;
  progress: number;
  error?: boolean;
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

  const uploadFile = async (
    file: File,
    bucket: string = 'media',
    folder: string = 'general',
    retries: number = 2
  ): Promise<string | null> => {
    const displayName = file.name;
    const safeName = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}_${file.name.replace(/[^\w.\-]+/g, '_')}`;
    const filePath = `${folder}/${safeName}`;

    bumpActive(+1);
    updateProgress(displayName, { progress: 10 });

    // Progresso indeterminado (supabase-js não expõe XHR progress)
    const tick = setInterval(() => {
      setUploadProgress(prev => prev.map(p =>
        p.fileName === displayName && p.progress < 90 && !p.error
          ? { ...p, progress: Math.min(90, p.progress + 8) }
          : p
      ));
    }, 400);

    let attempt = 0;
    try {
      while (attempt < retries) {
        try {
          const { error } = await supabaseExternal.storage
            .from(bucket)
            .upload(filePath, file, { cacheControl: '3600', upsert: false, contentType: file.type || undefined });

          if (error) throw error;

          updateProgress(displayName, { progress: 100 });
          const { data: { publicUrl } } = supabaseExternal.storage.from(bucket).getPublicUrl(filePath);
          scheduleCleanup(displayName, 1200);
          return publicUrl;
        } catch (error: any) {
          attempt++;
          const raw = error?.message || error?.error || error?.statusText || '';
          const status = error?.status || error?.statusCode;
          console.error(`[upload] tentativa ${attempt} falhou`, { status, raw, error });

          const isBucketMissing = /bucket not found/i.test(raw) || String(status) === '404';
          const isForbidden = String(status) === '403' || /row-level security|not authorized|unauthorized/i.test(raw);
          const isTooLarge = /payload too large|maximum allowed size|too large/i.test(raw) || String(status) === '413';
          const isDuplicate = /already exists|duplicate/i.test(raw) || String(status) === '409';
          const definitive = isBucketMissing || isForbidden || isTooLarge || isDuplicate;

          if (attempt >= retries || definitive) {
            let msg = raw || 'Erro desconhecido';
            if (isBucketMissing) msg = `Bucket "${bucket}" não existe. Rode o SQL de setup.`;
            else if (isForbidden) msg = 'Sem permissão. Faça login novamente ou revise as policies.';
            else if (isTooLarge) msg = 'Arquivo maior que o limite do bucket.';
            else if (isDuplicate) msg = 'Arquivo duplicado.';

            updateProgress(displayName, { error: true, progress: 100 });
            toast.error(`Falha no upload: ${displayName}`, { description: msg });
            scheduleCleanup(displayName, 3000);
            return null;
          }

          await new Promise(r => setTimeout(r, 800 * attempt));
        }
      }
      return null;
    } finally {
      clearInterval(tick);
      bumpActive(-1);
    }
  };

  return { uploadFile, isUploading, uploadProgress };
}
