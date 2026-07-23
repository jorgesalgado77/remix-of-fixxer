import React, { useEffect, useRef, useState } from 'react';
import { RotateCcw, RotateCw, Crop as CropIcon, Check, X, SkipForward } from 'lucide-react';
import { Button } from '@/components/ui/button';

/**
 * Editor leve de imagens: rotação em 90° e recorte retangular por arraste.
 * Retorna um novo File já processado (mantém MIME quando possível, cai para PNG/JPEG).
 * Após confirmar/pular, o pipeline padrão gera thumbnails e aplica fallback AVIF→WEBP.
 */

interface QueueItem {
  file: File;
  previewUrl: string;
}

interface Props {
  files: File[];
  onDone: (result: File[]) => void;
  onCancel: () => void;
}

type Rect = { x: number; y: number; w: number; h: number };

async function fileToImage(file: File): Promise<HTMLImageElement> {
  const url = URL.createObjectURL(file);
  try {
    return await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('Falha ao carregar imagem'));
      img.src = url;
    });
  } finally {
    // Revogar após carregar não é seguro em Safari; deixamos o GC.
    setTimeout(() => URL.revokeObjectURL(url), 30_000);
  }
}

function pickOutputMime(inputMime: string): string {
  if (inputMime === 'image/png' || inputMime === 'image/webp' || inputMime === 'image/jpeg') return inputMime;
  // AVIF/GIF/desconhecido -> JPEG (canvas nem sempre codifica AVIF)
  return 'image/jpeg';
}

function renameWithMime(name: string, mime: string): string {
  const base = (name || 'imagem').replace(/\.[^.]+$/, '');
  const ext = mime === 'image/png' ? 'png' : mime === 'image/webp' ? 'webp' : 'jpg';
  return `${base}.${ext}`;
}

export function ImageEditorModal({ files, onDone, onCancel }: Props) {
  const [queue] = useState<QueueItem[]>(() =>
    files.filter((f) => f.type.startsWith('image/')).map((f) => ({ file: f, previewUrl: URL.createObjectURL(f) })),
  );
  const [idx, setIdx] = useState(0);
  const [results, setResults] = useState<File[]>([]);
  const [rotation, setRotation] = useState(0); // múltiplos de 90
  const [cropMode, setCropMode] = useState(false);
  const [cropRect, setCropRect] = useState<Rect | null>(null); // em coordenadas do wrapper renderizado
  const [isDrawing, setIsDrawing] = useState(false);
  const startRef = useRef<{ x: number; y: number } | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);

  const current = queue[idx];

  useEffect(() => {
    setRotation(0);
    setCropRect(null);
    setCropMode(false);
  }, [idx]);

  useEffect(() => {
    return () => queue.forEach((q) => URL.revokeObjectURL(q.previewUrl));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onCancel]);

  const finish = (allResults: File[]) => {
    queue.forEach((q) => URL.revokeObjectURL(q.previewUrl));
    onDone(allResults);
  };

  const skipCurrent = () => {
    const next = [...results, current.file];
    if (idx + 1 >= queue.length) return finish(next);
    setResults(next);
    setIdx(idx + 1);
  };

  const applyAndNext = async () => {
    if (!current) return;
    try {
      const img = await fileToImage(current.file);
      const rotated = ((rotation % 360) + 360) % 360;

      // Descobre a bounding-box após rotação, na resolução natural.
      const naturalW = img.naturalWidth;
      const naturalH = img.naturalHeight;
      const boxW = rotated % 180 === 0 ? naturalW : naturalH;
      const boxH = rotated % 180 === 0 ? naturalH : naturalW;

      // Se há crop, mapeia rect renderizado -> pixels naturais da box rotacionada.
      let sx = 0,
        sy = 0,
        sw = boxW,
        sh = boxH;
      if (cropRect && wrapRef.current && imgRef.current) {
        const rendered = imgRef.current.getBoundingClientRect();
        const scaleX = boxW / rendered.width;
        const scaleY = boxH / rendered.height;
        sx = Math.max(0, Math.round(cropRect.x * scaleX));
        sy = Math.max(0, Math.round(cropRect.y * scaleY));
        sw = Math.max(1, Math.round(cropRect.w * scaleX));
        sh = Math.max(1, Math.round(cropRect.h * scaleY));
        if (sx + sw > boxW) sw = boxW - sx;
        if (sy + sh > boxH) sh = boxH - sy;
      }

      // Canvas 1: desenha a imagem rotacionada em resolução natural.
      const rotCanvas = document.createElement('canvas');
      rotCanvas.width = boxW;
      rotCanvas.height = boxH;
      const rctx = rotCanvas.getContext('2d');
      if (!rctx) throw new Error('Canvas indisponível');
      rctx.save();
      rctx.translate(boxW / 2, boxH / 2);
      rctx.rotate((rotated * Math.PI) / 180);
      rctx.drawImage(img, -naturalW / 2, -naturalH / 2);
      rctx.restore();

      // Canvas 2: recorta a região desejada.
      const outCanvas = document.createElement('canvas');
      outCanvas.width = sw;
      outCanvas.height = sh;
      const octx = outCanvas.getContext('2d');
      if (!octx) throw new Error('Canvas indisponível');
      octx.drawImage(rotCanvas, sx, sy, sw, sh, 0, 0, sw, sh);

      const outMime = pickOutputMime(current.file.type || 'image/jpeg');
      const blob: Blob = await new Promise((resolve, reject) =>
        outCanvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Falha ao codificar'))), outMime, 0.92),
      );
      const outFile = new File([blob], renameWithMime(current.file.name, blob.type || outMime), {
        type: blob.type || outMime,
        lastModified: Date.now(),
      });

      const next = [...results, outFile];
      if (idx + 1 >= queue.length) return finish(next);
      setResults(next);
      setIdx(idx + 1);
    } catch (err) {
      console.warn('[image-editor] falhou, usando original:', err);
      skipCurrent();
    }
  };

  // ---- Crop drag handlers ----
  const onPointerDown = (e: React.PointerEvent) => {
    if (!cropMode || !wrapRef.current) return;
    (e.target as Element).setPointerCapture?.(e.pointerId);
    const rect = wrapRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    startRef.current = { x, y };
    setCropRect({ x, y, w: 0, h: 0 });
    setIsDrawing(true);
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!isDrawing || !startRef.current || !wrapRef.current) return;
    const rect = wrapRef.current.getBoundingClientRect();
    const x = Math.min(Math.max(0, e.clientX - rect.left), rect.width);
    const y = Math.min(Math.max(0, e.clientY - rect.top), rect.height);
    const sx = startRef.current.x;
    const sy = startRef.current.y;
    setCropRect({ x: Math.min(sx, x), y: Math.min(sy, y), w: Math.abs(x - sx), h: Math.abs(y - sy) });
  };
  const onPointerUp = () => {
    setIsDrawing(false);
    startRef.current = null;
    if (cropRect && (cropRect.w < 12 || cropRect.h < 12)) setCropRect(null);
  };

  if (!current) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Editor de imagem"
      className="fixed inset-0 z-[110] bg-black/95 backdrop-blur-sm flex flex-col items-center justify-center p-4"
    >
      <div className="w-full max-w-4xl flex items-center justify-between mb-3 text-white">
        <div className="text-[11px] font-black uppercase italic tracking-wider">
          Editar imagem {idx + 1} / {queue.length}
        </div>
        <button
          onClick={onCancel}
          aria-label="Cancelar edição e fechar"
          className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div
        ref={wrapRef}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        className={`relative bg-black/60 rounded-xl overflow-hidden select-none max-w-4xl w-full flex items-center justify-center ${
          cropMode ? 'cursor-crosshair' : ''
        }`}
        style={{ maxHeight: '70vh' }}
      >
        <img
          ref={imgRef}
          src={current.previewUrl}
          alt={`Pré-visualização de ${current.file.name}`}
          draggable={false}
          className="max-h-[70vh] w-auto object-contain pointer-events-none"
          style={{ transform: `rotate(${rotation}deg)`, transformOrigin: 'center center' }}
        />
        {cropRect && (
          <div
            className="absolute border-2 border-primary bg-primary/10 pointer-events-none"
            style={{ left: cropRect.x, top: cropRect.y, width: cropRect.w, height: cropRect.h }}
            aria-hidden="true"
          />
        )}
      </div>

      <div className="flex flex-wrap items-center justify-center gap-2 mt-4">
        <Button
          onClick={() => setRotation((r) => r - 90)}
          className="h-9 bg-white/10 hover:bg-white/20 text-white rounded-lg text-[11px] font-black uppercase italic"
        >
          <RotateCcw className="w-3.5 h-3.5 mr-1.5" /> Girar -90°
        </Button>
        <Button
          onClick={() => setRotation((r) => r + 90)}
          className="h-9 bg-white/10 hover:bg-white/20 text-white rounded-lg text-[11px] font-black uppercase italic"
        >
          <RotateCw className="w-3.5 h-3.5 mr-1.5" /> Girar +90°
        </Button>
        <Button
          onClick={() => {
            setCropMode((v) => !v);
            if (cropMode) setCropRect(null);
          }}
          aria-pressed={cropMode}
          className={`h-9 rounded-lg text-[11px] font-black uppercase italic ${
            cropMode ? 'bg-primary text-black hover:bg-primary/90' : 'bg-white/10 hover:bg-white/20 text-white'
          }`}
        >
          <CropIcon className="w-3.5 h-3.5 mr-1.5" /> {cropMode ? 'Cropando (arraste)' : 'Recortar'}
        </Button>
        {cropRect && (
          <Button
            onClick={() => setCropRect(null)}
            className="h-9 bg-white/10 hover:bg-white/20 text-white rounded-lg text-[11px] font-black uppercase italic"
          >
            Limpar recorte
          </Button>
        )}
        <Button
          onClick={skipCurrent}
          className="h-9 bg-white/10 hover:bg-white/20 text-white rounded-lg text-[11px] font-black uppercase italic"
        >
          <SkipForward className="w-3.5 h-3.5 mr-1.5" /> Pular
        </Button>
        <Button
          onClick={applyAndNext}
          className="h-9 bg-primary text-black hover:bg-primary/90 rounded-lg text-[11px] font-black uppercase italic"
        >
          <Check className="w-3.5 h-3.5 mr-1.5" /> {idx + 1 === queue.length ? 'Aplicar e enviar' : 'Aplicar e próximo'}
        </Button>
      </div>
    </div>
  );
}
