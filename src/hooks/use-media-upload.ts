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
    folder: string = 'general'
  ) => {
    setIsUploading(true);
    const fileName = `${Date.now()}_${file.name.replace(/\s/g, '_')}`;
    const filePath = `${folder}/${fileName}`;

    setUploadProgress(prev => [...prev, { fileName: file.name, progress: 0 }]);

    try {
      // Nota: O Supabase JS SDK v2 não tem um callback nativo de progresso no método .upload
      // Para barra de progresso real, precisaríamos usar XMLHttpRequest ou o novo Tus.io se habilitado.
      // Como queremos persistência e atualização em tempo real, usaremos o upload simples e simularemos progresso ou usaremos status.
      
      const { data, error } = await supabaseExternal.storage
        .from(bucket)
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (error) throw error;

      // Simular progresso finalizado
      setUploadProgress(prev => 
        prev.map(p => p.fileName === file.name ? { ...p, progress: 100 } : p)
      );

      const { data: { publicUrl } } = supabaseExternal.storage
        .from(bucket)
        .getPublicUrl(filePath);

      return publicUrl;
    } catch (error: any) {
      console.error('Erro no upload:', error);
      toast.error(`Falha no upload de ${file.name}`);
      return null;
    } finally {
      setIsUploading(false);
      // Limpar progresso após um tempo
      setTimeout(() => {
        setUploadProgress(prev => prev.filter(p => p.fileName !== file.name));
      }, 2000);
    }
  };

  return {
    uploadFile,
    isUploading,
    uploadProgress
  };
}
