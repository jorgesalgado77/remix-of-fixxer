import { useState, useRef, useEffect } from 'react';
import { Play, Pause, Volume2, VolumeX, Maximize, Settings, SkipForward, SkipBack } from 'lucide-react';

interface FixxerPlayerProps {
  url: string;
  onProgress?: (seconds: number) => void;
  lastPosition?: number;
  onEnded?: () => void;
}

export function FixxerPlayer({ url, onProgress, lastPosition = 0, onEnded }: FixxerPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [muted, setMuted] = useState(false);

  useEffect(() => {
    if (videoRef.current && lastPosition > 0) {
      videoRef.current.currentTime = lastPosition;
    }
  }, [lastPosition]);

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

  return (
    <div className="relative group rounded-2xl overflow-hidden bg-black aspect-video w-full shadow-2xl">
      <video
        ref={videoRef}
        src={url}
        className="w-full h-full"
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={() => setDuration(videoRef.current?.duration || 0)}
        onEnded={onEnded}
        controlsList="nodownload"
      />
      
      {/* UI Customizada do Player */}
      <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
        <div className="flex items-center gap-4 text-white">
          <button onClick={togglePlay}>{isPlaying ? <Pause /> : <Play />}</button>
          <div className="flex-1 h-1 bg-white/20 rounded-full cursor-pointer">
            <div className="h-full bg-primary" style={{ width: `${(progress / duration) * 100}%` }} />
          </div>
          <button onClick={() => setMuted(!muted)}>{muted ? <VolumeX /> : <Volume2 />}</button>
          <button onClick={() => videoRef.current?.requestFullscreen()}><Maximize /></button>
        </div>
      </div>
    </div>
  );
}
