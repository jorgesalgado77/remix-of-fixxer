import { useState } from 'react';
import { supabaseExternal } from '@/lib/supabaseExternal';
import { toast } from 'sonner';

export interface UploadProgress {
  fileName: string;
  progress: number;
  error?: boolean;
}

export function useMediaUpload() {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<UploadProgress[]>([]);

  const uploadFile = async (
    file: File,
    bucket: string = 'media',
    folder: string = 'general',
    retries: number = 3
  ): Promise<string | null> => {
    setIsUploading(true);
    const fileName = `${Date.now()}_${file.name.replace(/\s/g, '_')}`;
    const filePath = `${folder}/${fileName}`;

    setUploadProgress(prev => [...prev, { fileName: file.name, progress: 0 }]);

    let attempt = 0;
    while (attempt < retries) {
      try {
        const { error } = await supabaseExternal.storage
          .from(bucket)
          .upload(filePath, file, {
            cacheControl: '3600',
            upsert: false
          });

        if (error) throw error;

        setUploadProgress(prev => 
          prev.map(p => p.fileName === file.name ? { ...p, progress: 100 } : p)
        );

        const { data: { publicUrl } } = supabaseExternal.storage
          .from(bucket)
          .getPublicUrl(filePath);

        return publicUrl;
      } catch (error: any) {
        attempt++;
        const raw = error?.message || error?.error || error?.statusText || "";
        const status = error?.status || error?.statusCode;
        console.error(`[upload] tentativa ${attempt} falhou`, { status, raw, error });

        // Erros definitivos: não vale a pena tentar de novo
        const isBucketMissing = /bucket not found/i.test(raw) || String(status) === "404";
        const isForbidden = String(status) === "403" || /new row violates row-level security|not authorized|unauthorized/i.test(raw);
        const isTooLarge = /payload too large|exceeded the maximum allowed size|too large/i.test(raw) || String(status) === "413";
        const isDuplicate = /already exists|duplicate/i.test(raw) || String(status) === "409";
        const definitive = isBucketMissing || isForbidden || isTooLarge || isDuplicate;

        if (attempt >= retries || definitive) {
          let errorMessage = raw || "Erro desconhecido";
          if (isBucketMissing) errorMessage = `Bucket "${bucket}" não existe no Supabase. Rode o SQL de setup do Storage.`;
          else if (isForbidden) errorMessage = "Sem permissão para upload. Faça login novamente ou revise as policies do bucket.";
          else if (isTooLarge) errorMessage = "Arquivo maior que o limite do bucket.";
          else if (/quota-exceeded/i.test(raw)) errorMessage = "Cota de armazenamento excedida.";

          setUploadProgress(prev =>
            prev.map(p => p.fileName === file.name ? { ...p, error: true, progress: 0 } : p)
          );

          toast.error(`Falha no upload: ${file.name}`, {
            description: errorMessage,
          });
          break;
        }

        const delay = 1000 * attempt;
        toast.info(`Retentando ${file.name}...`, {
          description: `Tentativa ${attempt + 1} de ${retries} em ${delay/1000}s`
        });
        await new Promise(resolve => setTimeout(resolve, delay));
      }

    }

    setIsUploading(false);
    setTimeout(() => {
      setUploadProgress(prev => prev.filter(p => p.fileName !== file.name));
    }, 2000);
    return null;
  };

  return {
    uploadFile,
    isUploading,
    uploadProgress
  };
}
