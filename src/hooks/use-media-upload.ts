import { useState } from 'react';
import { supabaseExternal } from '@/lib/supabaseExternal';
import { toast } from 'sonner';

export interface UploadProgress {
  fileName: string;
  progress: number;
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
        console.error(`Tentativa ${attempt} falhou:`, error);
        
        if (attempt >= retries) {
          let errorMessage = "Erro desconhecido";
          if (error.message?.includes('storage/quota-exceeded')) errorMessage = "Cota de armazenamento excedida";
          if (error.message?.includes('payload too large')) errorMessage = "Arquivo muito grande para o servidor";
          if (error.status === 403) errorMessage = "Sem permissão para upload";
          
          toast.error(`Falha crítica no upload: ${file.name}`, {
            description: `${errorMessage}. Tente novamente mais tarde.`
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
