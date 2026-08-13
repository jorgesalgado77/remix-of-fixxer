import { useState, useEffect } from 'react';
import { getSecureInfoUrl } from '@/lib/info-storage.server';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertTriangle, Lock } from 'lucide-react';

interface InfoSecurePlayerProps {
  productId: string;
  filePath: string;
  type: 'video' | 'pdf';
  title?: string;
  className?: string;
}

/**
 * Player/Viewer Seguro para Info Produtos.
 * Segue Prompt 02: Nunca expõe URL permanente, usa Signed URL temporária.
 */
export function InfoSecurePlayer({ productId, filePath, type, title, className }: InfoSecurePlayerProps) {
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadSecureUrl() {
      try {
        setLoading(true);
        // Chama a Server Function para obter a URL assinada
        const result = await getSecureInfoUrl({ data: { productId, filePath } } as any);
        setUrl(result.url);
      } catch (err: any) {
        console.error('[SecurePlayer] Erro:', err);
        setError(err.message || 'Falha ao carregar conteúdo seguro.');
      } finally {
        setLoading(false);
      }
    }

    if (productId && filePath) loadSecureUrl();
  }, [productId, filePath]);

  if (loading) return <Skeleton className="w-full aspect-video rounded-2xl" />;

  if (error) {
    return (
      <div className="w-full aspect-video rounded-2xl bg-white/5 border border-white/10 flex flex-col items-center justify-center text-center p-6 gap-4">
        <AlertTriangle className="w-12 h-12 text-amber-500" />
        <div className="space-y-1">
          <p className="font-bold text-white uppercase tracking-tight">Acesso Negado</p>
          <p className="text-sm text-muted-foreground">{error}</p>
        </div>
      </div>
    );
  }

  if (type === 'video') {
    return (
      <div className={`relative group ${className || ''}`}>
        <video 
          src={url!} 
          controls 
          className="w-full rounded-2xl shadow-2xl"
          controlsList="nodownload"
          onContextMenu={(e) => e.preventDefault()}
        />
        <div className="absolute top-4 right-4 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10 flex items-center gap-2 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity">
          <Lock className="w-3 h-3 text-primary" />
          <span className="text-[10px] font-black text-white uppercase tracking-widest">Protegido por FIXXER</span>
        </div>
      </div>
    );
  }

  if (type === 'pdf') {
    return (
      <iframe 
        src={`${url}#toolbar=0`} 
        className={`w-full h-[600px] rounded-2xl border border-white/10 ${className || ''}`}
        title={title}
      />
    );
  }

  return null;
}
