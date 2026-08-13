import { supabaseExternal } from '@/lib/supabaseExternal';
import { toast } from 'sonner';
import { useMediaUpload } from './use-media-upload';

/**
 * Hook especializado para upload de Info Produtos (Arquivos Privados).
 * Segue Prompt 02: Validação rigorosa e separação Public/Private.
 */
export function useInfoMediaUpload() {
  const { uploadFileDetailed, isUploading, uploadProgress } = useMediaUpload();

  const uploadInfoFile = async (
    file: File,
    options: {
      productId: string;
      isPrivate?: boolean;
      folder?: string;
    }
  ) => {
    // 1. Validação de MIME (Regra Mestra: Não confiar apenas no browser)
    const allowedMimes = [
      'application/pdf',
      'video/mp4',
      'video/quicktime',
      'image/jpeg',
      'image/png',
      'image/webp',
      'application/zip',
      'application/x-zip-compressed'
    ];

    if (!allowedMimes.includes(file.type)) {
      toast.error('Tipo de arquivo não permitido.');
      return null;
    }

    // 2. Limite de tamanho (Exemplo: 500MB para vídeos)
    const maxSize = 500 * 1024 * 1024;
    if (file.size > maxSize) {
      toast.error('Arquivo muito grande (máx 500MB).');
      return null;
    }

    // 3. Determinar bucket baseado na privacidade (Prompt 02)
    // 'media' é público, 'info-private' (deve ser criado no Supabase) é privado.
    const bucket = options.isPrivate ? 'info-private' : 'media';
    const folder = `info/${options.productId}/${options.folder || 'content'}`;

    return uploadFileDetailed(file, {
      bucket,
      folder,
      generateThumb: !options.isPrivate && file.type.startsWith('image/')
    });
  };

  return { uploadInfoFile, isUploading, uploadProgress };
}
