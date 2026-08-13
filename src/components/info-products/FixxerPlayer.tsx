import { useState, useRef, useEffect } from 'react';
import { Play, Pause, Volume2, VolumeX, Maximize, Lock } from 'lucide-react';
import { getSecureInfoUrl } from '@/lib/info-storage.server';
import { Skeleton } from '@/components/ui/skeleton';

interface FixxerPlayerProps {
  productId: string;
  filePath: string;
  title?: string;
  onProgress?: (seconds: number) => void;
  lastPosition?: number;
  onEnded?: () => void;
}

/**
 * Player de Vídeo Seguro (Prompt 07/08).
 * Integrado com URLs assinadas e proteção de conteúdo.
 */
export function FixxerPlayer({ 
  productId, 
  filePath, 
  title, 
  onProgress, 
  lastPosition = 0, 
  onEnded 
}: FixxerPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [muted, setMuted] = useState(false);

  useEffect(() => {
    async function loadSecureUrl() {
      try {
        setLoading(true);
        // @ts-ignore
        const result = await getSecureInfoUrl({ data: { productId, filePath } });
        setUrl(result.url);
      } catch (err: any) {
        setError(err.message || 'Erro ao carregar vídeo seguro.');
      } finally {
        setLoading(false);
      }
    }
    loadSecureUrl();
  }, [productId, filePath]);

  useEffect(() => {
    if (videoRef.current && lastPosition > 0 && !loading) {
      videoRef.current.currentTime = lastPosition;
    }
  }, [lastPosition, loading]);

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (isPlaying) videoRef.current.pause();
    else videoRef.current.play();
    setIsPlaying(!isPlaying);
  };

  const handleTimeUpdate = () => {
    if (!videoRef.current) return;
    const current = videoRef.current.currentTime;
    setProgress(current);
    onProgress?.(Math.floor(current));
  };

  if (loading) return <Skeleton className="w-full aspect-video rounded-2xl" />;
  if (error) return (
    <div className="w-full aspect-video bg-black/40 rounded-2xl flex items-center justify-center text-white border border-white/10">
      <p className="text-sm font-bold uppercase tracking-widest text-red-500">{error}</p>
    </div>
  );

  return (
    <div className="relative group rounded-2xl overflow-hidden bg-black aspect-video w-full shadow-2xl border border-white/10">
      <video
        ref={videoRef}
        src={url!}
        className="w-full h-full"
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={() => setDuration(videoRef.current?.duration || 0)}
        onEnded={onEnded}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        controlsList="nodownload"
        onContextMenu={(e) => e.preventDefault()}
      />
      
      {/* Overlay de Proteção */}
      <div className="absolute top-4 right-4 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10 flex items-center gap-2 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity">
        <Lock className="w-3 h-3 text-primary" />
        <span className="text-[10px] font-black text-white uppercase tracking-widest">Protegido por FIXXER</span>
      </div>

      {/* UI Customizada do Player */}
      <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
        <div className="flex items-center gap-4 text-white">
          <button onClick={togglePlay} className="hover:text-primary transition-colors">
            {isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current" />}
          </button>
          
          <div className="flex-1 h-1 bg-white/20 rounded-full cursor-pointer relative overflow-hidden">
            <div 
              className="h-full bg-primary transition-all duration-100" 
              style={{ width: `${duration ? (progress / duration) * 100 : 0}%` }} 
            />
          </div>

          <div className="text-[10px] font-mono tabular-nums">
            {Math.floor(progress / 60)}:{(progress % 60).toFixed(0).padStart(2, '0')} / 
            {Math.floor(duration / 60)}:{(duration % 60).toFixed(0).padStart(2, '0')}
          </div>

          <button onClick={() => setMuted(!muted)} className="hover:text-primary transition-colors">
            {muted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
          </button>
          
          <button onClick={() => videoRef.current?.requestFullscreen()} className="hover:text-primary transition-colors">
            <Maximize className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
