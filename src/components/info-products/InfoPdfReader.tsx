import React, { useState, useEffect, Suspense } from 'react';
import { getSecureInfoUrl } from '@/lib/info-storage.server';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertTriangle, Lock, Download, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

import '@react-pdf-viewer/core/lib/styles/index.css';
import '@react-pdf-viewer/default-layout/lib/styles/index.css';

// Usamos importação dinâmica pura para os componentes que dependem de canvas/pdf.js no servidor
const PdfViewerContainer = React.lazy(async () => {
  const [core, layout] = await Promise.all([
    import('@react-pdf-viewer/core'),
    import('@react-pdf-viewer/default-layout')
  ]);
  
  const { Worker, Viewer } = core;
  const { defaultLayoutPlugin } = layout;

  return {
    default: ({ fileUrl, title }: { fileUrl: string; title?: string }) => {
      const defaultLayoutPluginInstance = defaultLayoutPlugin({
        sidebarTabs: () => [], 
      });

      return (
        <Worker workerUrl="https://unpkg.com/pdfjs-dist@3.4.120/build/pdf.worker.min.js">
          <Viewer
            fileUrl={fileUrl}
            plugins={[defaultLayoutPluginInstance]}
            theme="dark"
          />
        </Worker>
      );
    }
  };
});

interface InfoPdfReaderProps {
  productId: string;
  filePath: string;
  title?: string;
  className?: string;
  allowDownload?: boolean;
}

/**
 * Leitor de PDF Seguro (Prompt 08).
 * Integrado com URLs assinadas e controle de entitlement.
 * Otimizado para Realme C55 (lazy loading e render condicional).
 */
export function InfoPdfReader({ 
  productId, 
  filePath, 
  title, 
  className, 
  allowDownload = false 
}: InfoPdfReaderProps) {
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    async function loadSecureUrl() {
      try {
        setLoading(true);
        // @ts-ignore
        const result = await getSecureInfoUrl({ data: { productId, filePath } });
        setUrl(result.url);
      } catch (err: any) {
        console.error('[PdfReader] Erro:', err);
        setError(err.message || 'Falha ao carregar documento.');
      } finally {
        setLoading(false);
      }
    }

    if (productId && filePath) loadSecureUrl();
  }, [productId, filePath]);

  const handleDownload = async () => {
    try {
      // @ts-ignore
      const result = await getSecureInfoUrl({ data: { productId, filePath, isDownload: true } });
      window.open(result.url, '_blank');
    } catch (err) {
      console.error('[PdfReader] Erro no download:', err);
    }
  };

  if (loading || !mounted) return <Skeleton className="w-full h-[600px] rounded-2xl" />;

  if (error) {
    return (
      <div className="w-full h-[400px] rounded-2xl bg-white/5 border border-white/10 flex flex-col items-center justify-center text-center p-6 gap-4">
        <AlertTriangle className="w-12 h-12 text-amber-500" />
        <div className="space-y-1">
          <p className="font-bold text-white uppercase tracking-tight">Erro no Documento</p>
          <p className="text-sm text-muted-foreground">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex flex-col gap-4 ${className || ''}`}>
      <div className="flex items-center justify-between px-2">
        <div className="flex items-center gap-2">
          <div className="bg-primary/20 p-2 rounded-lg">
            <Lock className="w-4 h-4 text-primary" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white leading-none">{title || 'Documento Seguro'}</h3>
            <p className="text-[10px] text-muted-foreground uppercase tracking-widest mt-1">FIXXER Secure Reader</p>
          </div>
        </div>

        {allowDownload && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={handleDownload}
                  className="h-8 border-white/10 bg-white/5 hover:bg-white/10 text-white gap-2"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span className="text-xs">Baixar PDF</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Baixar cópia para leitura offline</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </div>

      <div className="relative h-[600px] w-full bg-black/40 rounded-2xl border border-white/10 overflow-hidden shadow-2xl">
        {url && (
          <Suspense fallback={
            <div className="w-full h-full flex flex-col items-center justify-center gap-4 bg-black/20">
              <Loader2 className="w-8 h-8 text-primary animate-spin" />
              <p className="text-[10px] text-muted-foreground uppercase tracking-widest">Iniciando Leitor Seguro...</p>
            </div>
          }>
            <PdfViewerContainer fileUrl={url} title={title} />
          </Suspense>
        )}
      </div>
    </div>
  );
}
