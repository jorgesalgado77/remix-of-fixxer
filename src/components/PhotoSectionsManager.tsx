import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Camera,
  PlusCircle,
  Trash,
  Pencil,
  Check,
  X,
  Image as ImageIcon,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Expand,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { useMediaUpload } from '@/hooks/use-media-upload';
import { processImage } from '@/utils/image-compression';
import { validateImage } from '@/utils/image-validation';
import { supabaseExternal } from '@/lib/supabaseExternal';

export type CustomPhotoSection = { id: string; name: string; photos: PhotoItem[] };
export type PhotoItem = { url: string; thumbUrl?: string } | string;
export type PhotoSectionsValue = {
  showroom: PhotoItem[];
  assemblies: PhotoItem[];
  custom: CustomPhotoSection[];
};

export const EMPTY_PHOTO_SECTIONS: PhotoSectionsValue = { showroom: [], assemblies: [], custom: [] };

// ---------- Limites configuráveis ----------
export interface PhotoLimits {
  imgMaxMB: number;         // tamanho máximo por arquivo
  sectionTotalMaxMB: number;// tamanho total acumulado por seção (estimativa client-side)
  maxShowroom: number;
  maxAssemblies: number;
  maxCustomSections: number;
  maxCustomPhotos: number;
}

export const DEFAULT_LIMITS: PhotoLimits = {
  imgMaxMB: 8,
  sectionTotalMaxMB: 80,
  maxShowroom: 20,
  maxAssemblies: 20,
  maxCustomSections: 5,
  maxCustomPhotos: 10,
};

const BUCKET = 'media';

const getUrl = (p: PhotoItem): string => (typeof p === 'string' ? p : p.url);
const getThumb = (p: PhotoItem): string => (typeof p === 'string' ? p : (p.thumbUrl || p.url));

// Extrai o path relativo dentro do bucket a partir da URL pública do Supabase Storage.
function extractStoragePath(url: string): string | null {
  const marker = `/storage/v1/object/public/${BUCKET}/`;
  const idx = url.indexOf(marker);
  if (idx < 0) return null;
  return decodeURIComponent(url.slice(idx + marker.length).split('?')[0]);
}

async function deletePhotoFromStorage(item: PhotoItem): Promise<void> {
  const paths: string[] = [];
  const url = getUrl(item);
  const p = extractStoragePath(url);
  if (p) paths.push(p);
  const t = typeof item === 'string' ? undefined : item.thumbUrl;
  if (t) {
    const tp = extractStoragePath(t);
    if (tp && tp !== p) paths.push(tp);
  }
  if (!paths.length) return;
  try {
    const { error } = await supabaseExternal.storage.from(BUCKET).remove(paths);
    if (error) console.warn('[storage] remove falhou (ignorado):', error);
  } catch (err) {
    console.warn('[storage] remove exceção (ignorada):', err);
  }
}

interface Props {
  value: PhotoSectionsValue;
  onChange: (next: PhotoSectionsValue) => void;
  limits?: Partial<PhotoLimits>;
}

export function PhotoSectionsManager({ value, onChange, limits }: Props) {
  const L: PhotoLimits = { ...DEFAULT_LIMITS, ...(limits ?? {}) };

  const safe: PhotoSectionsValue = {
    showroom: Array.isArray(value?.showroom) ? value.showroom : [],
    assemblies: Array.isArray(value?.assemblies) ? value.assemblies : [],
    custom: Array.isArray(value?.custom) ? value.custom : [],
  };
  const { uploadFileDetailed, uploadProgress } = useMediaUpload();
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');

  // Lightbox global (todas as fotos, todas as seções)
  const flatPhotos = useMemo(() => {
    const list: { url: string; thumb: string; sectionName: string }[] = [];
    safe.showroom.forEach((p) => list.push({ url: getUrl(p), thumb: getThumb(p), sectionName: 'Show Room' }));
    safe.assemblies.forEach((p) => list.push({ url: getUrl(p), thumb: getThumb(p), sectionName: 'Montagens Realizadas' }));
    safe.custom.forEach((s) =>
      s.photos.forEach((p) => list.push({ url: getUrl(p), thumb: getThumb(p), sectionName: s.name })),
    );
    return list;
  }, [safe]);

  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const openLightbox = (url: string) => {
    const idx = flatPhotos.findIndex((p) => p.url === url);
    setLightboxIndex(idx >= 0 ? idx : 0);
  };

  // -------- upload core --------
  const validateBatch = (files: File[], existing: PhotoItem[], limit: number): File[] => {
    const remaining = Math.max(0, limit - existing.length);
    if (remaining <= 0) {
      toast.error('Limite de fotos atingido', { description: `Esta seção só permite ${limit} fotos.` });
      return [];
    }
    let list = files.slice(0, remaining);
    // Limite de tamanho total (estimado apenas para o lote atual)
    const totalBytes = list.reduce((s, f) => s + f.size, 0);
    if (totalBytes > L.sectionTotalMaxMB * 1024 * 1024) {
      toast.error('Tamanho total excedido', {
        description: `O lote enviado (${(totalBytes / 1024 / 1024).toFixed(1)}MB) ultrapassa o limite de ${L.sectionTotalMaxMB}MB.`,
      });
      return [];
    }
    if (files.length > remaining) {
      toast.warning(`Apenas ${remaining} foto(s) serão enviadas — limite da seção atingido.`);
    }
    return list;
  };

  const uploadImages = async (
    files: File[],
    folder: string,
    limit: number,
    existing: PhotoItem[],
  ): Promise<PhotoItem[]> => {
    const list = validateBatch(files, existing, limit);
    if (!list.length) return [];
    const uploaded: PhotoItem[] = [];
    for (const original of list) {
      const check = validateImage(original, L.imgMaxMB * 1024 * 1024);
      if (!check.ok) {
        toast.error('Arquivo não aceito', { description: check.error });
        continue;
      }
      let processed;
      try {
        processed = await processImage(original, { maxWidth: 1600, quality: 0.82 });
      } catch (err) {
        console.warn('processImage falhou, usando original:', err);
        processed = { file: original, mime: check.mime, ext: check.ext, width: 0, height: 0 };
      }
      const res = await uploadFileDetailed(processed.file, {
        bucket: BUCKET,
        folder,
        contentType: processed.mime,
        generateThumb: true,
      });
      if (res) uploaded.push({ url: res.url, thumbUrl: res.thumbUrl });
    }
    return uploaded;
  };

  // -------- add handlers --------
  const handleAddShowroom = async (files: File[]) => {
    setBusyKey('showroom');
    const urls = await uploadImages(files, 'showroom', L.maxShowroom, safe.showroom);
    if (urls.length) onChange({ ...safe, showroom: [...safe.showroom, ...urls] });
    setBusyKey(null);
  };
  const handleAddAssemblies = async (files: File[]) => {
    setBusyKey('assemblies');
    const urls = await uploadImages(files, 'assemblies', L.maxAssemblies, safe.assemblies);
    if (urls.length) onChange({ ...safe, assemblies: [...safe.assemblies, ...urls] });
    setBusyKey(null);
  };
  const handleAddCustom = async (sectionId: string, files: File[]) => {
    const section = safe.custom.find((s) => s.id === sectionId);
    if (!section) return;
    setBusyKey(sectionId);
    const urls = await uploadImages(files, `custom-${sectionId}`, L.maxCustomPhotos, section.photos);
    if (urls.length) {
      onChange({
        ...safe,
        custom: safe.custom.map((s) => (s.id === sectionId ? { ...s, photos: [...s.photos, ...urls] } : s)),
      });
    }
    setBusyKey(null);
  };

  // -------- remove & replace --------
  const removeShowroom = async (item: PhotoItem) => {
    onChange({ ...safe, showroom: safe.showroom.filter((p) => getUrl(p) !== getUrl(item)) });
    await deletePhotoFromStorage(item);
  };
  const removeAssemblies = async (item: PhotoItem) => {
    onChange({ ...safe, assemblies: safe.assemblies.filter((p) => getUrl(p) !== getUrl(item)) });
    await deletePhotoFromStorage(item);
  };
  const removeCustom = async (sectionId: string, item: PhotoItem) => {
    onChange({
      ...safe,
      custom: safe.custom.map((s) =>
        s.id === sectionId ? { ...s, photos: s.photos.filter((p) => getUrl(p) !== getUrl(item)) } : s,
      ),
    });
    await deletePhotoFromStorage(item);
  };

  const replaceIn = async (
    folder: string,
    file: File,
    oldItem: PhotoItem,
    apply: (newItem: PhotoItem) => void,
  ) => {
    const check = validateImage(file, L.imgMaxMB * 1024 * 1024);
    if (!check.ok) {
      toast.error('Arquivo não aceito', { description: check.error });
      return;
    }
    let processed;
    try {
      processed = await processImage(file, { maxWidth: 1600, quality: 0.82 });
    } catch {
      processed = { file, mime: check.mime, ext: check.ext, width: 0, height: 0 };
    }
    const res = await uploadFileDetailed(processed.file, {
      bucket: BUCKET,
      folder,
      contentType: processed.mime,
      generateThumb: true,
    });
    if (!res) return;
    apply({ url: res.url, thumbUrl: res.thumbUrl });
    await deletePhotoFromStorage(oldItem);
    toast.success('Foto substituída');
  };

  const replaceShowroom = (oldItem: PhotoItem, file: File) => {
    setBusyKey('showroom');
    return replaceIn('showroom', file, oldItem, (newItem) => {
      onChange({
        ...safe,
        showroom: safe.showroom.map((p) => (getUrl(p) === getUrl(oldItem) ? newItem : p)),
      });
    }).finally(() => setBusyKey(null));
  };
  const replaceAssemblies = (oldItem: PhotoItem, file: File) => {
    setBusyKey('assemblies');
    return replaceIn('assemblies', file, oldItem, (newItem) => {
      onChange({
        ...safe,
        assemblies: safe.assemblies.map((p) => (getUrl(p) === getUrl(oldItem) ? newItem : p)),
      });
    }).finally(() => setBusyKey(null));
  };
  const replaceCustom = (sectionId: string, oldItem: PhotoItem, file: File) => {
    setBusyKey(sectionId);
    return replaceIn(`custom-${sectionId}`, file, oldItem, (newItem) => {
      onChange({
        ...safe,
        custom: safe.custom.map((s) =>
          s.id === sectionId
            ? { ...s, photos: s.photos.map((p) => (getUrl(p) === getUrl(oldItem) ? newItem : p)) }
            : s,
        ),
      });
    }).finally(() => setBusyKey(null));
  };

  // -------- section CRUD --------
  const addSection = () => {
    if (safe.custom.length >= L.maxCustomSections) {
      toast.error(`Limite de ${L.maxCustomSections} seções personalizadas atingido.`);
      return;
    }
    const id = `sec_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const next = { ...safe, custom: [...safe.custom, { id, name: 'Nova Seção', photos: [] }] };
    onChange(next);
    setEditingId(id);
    setEditingName('Nova Seção');
  };
  const removeSection = async (id: string) => {
    const section = safe.custom.find((s) => s.id === id);
    onChange({ ...safe, custom: safe.custom.filter((s) => s.id !== id) });
    if (section) {
      await Promise.all(section.photos.map((p) => deletePhotoFromStorage(p)));
    }
  };
  const saveSectionName = (id: string) => {
    const name = editingName.trim() || 'Seção sem nome';
    onChange({ ...safe, custom: safe.custom.map((s) => (s.id === id ? { ...s, name } : s)) });
    setEditingId(null);
    setEditingName('');
  };

  const inProgress = uploadProgress.filter((p) => !p.error && p.progress < 100);

  return (
    <div className="space-y-8 pt-6 border-t border-white/5">
      <PhotoBlock
        title="Fotos do Show Room"
        icon={<Camera className="w-3 h-3 text-primary" />}
        photos={safe.showroom}
        max={L.maxShowroom}
        onAdd={handleAddShowroom}
        onRemove={removeShowroom}
        onReplace={replaceShowroom}
        onOpen={openLightbox}
        busy={busyKey === 'showroom'}
        progressList={busyKey === 'showroom' ? inProgress : []}
      />
      <PhotoBlock
        title="Montagens Realizadas"
        icon={<ImageIcon className="w-3 h-3 text-primary" />}
        photos={safe.assemblies}
        max={L.maxAssemblies}
        onAdd={handleAddAssemblies}
        onRemove={removeAssemblies}
        onReplace={replaceAssemblies}
        onOpen={openLightbox}
        busy={busyKey === 'assemblies'}
        progressList={busyKey === 'assemblies' ? inProgress : []}
      />

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-xs font-black uppercase italic text-primary">Seções Personalizadas</h4>
            <p className="text-[10px] text-muted-foreground mt-1">
              Crie até {L.maxCustomSections} seções nomeadas (ex.: Cozinhas, Dormitórios) — {L.maxCustomPhotos} fotos cada.
            </p>
          </div>
          <Button
            onClick={addSection}
            disabled={safe.custom.length >= L.maxCustomSections}
            className="h-8 bg-primary text-black font-black uppercase italic text-[10px] rounded-xl hover:bg-primary/90 disabled:opacity-40"
          >
            <PlusCircle className="w-3 h-3 mr-1.5" /> Nova Seção ({safe.custom.length}/{L.maxCustomSections})
          </Button>
        </div>

        {safe.custom.map((section) => (
          <div key={section.id} className="rounded-2xl border border-white/10 bg-black/20 p-4 space-y-3">
            <div className="flex items-center justify-between gap-2">
              {editingId === section.id ? (
                <div className="flex items-center gap-2 flex-1">
                  <Input
                    autoFocus
                    value={editingName}
                    onChange={(e) => setEditingName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') saveSectionName(section.id);
                    }}
                    placeholder="Ex.: Cozinhas"
                    className="h-9 bg-black/40 border-white/10 rounded-lg text-xs"
                  />
                  <Button size="sm" onClick={() => saveSectionName(section.id)} className="h-9 px-3 bg-primary text-black rounded-lg">
                    <Check className="w-3 h-3" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setEditingId(null);
                      setEditingName('');
                    }}
                    className="h-9 px-3"
                  >
                    <X className="w-3 h-3" />
                  </Button>
                </div>
              ) : (
                <div className="flex items-center gap-2 flex-1">
                  <span className="text-xs font-black uppercase italic text-white">{section.name}</span>
                  <span className="text-[9px] text-muted-foreground">
                    ({section.photos.length}/{L.maxCustomPhotos})
                  </span>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setEditingId(section.id);
                      setEditingName(section.name);
                    }}
                    className="h-7 px-2 text-[9px] text-muted-foreground hover:text-white"
                  >
                    <Pencil className="w-3 h-3 mr-1" /> Renomear
                  </Button>
                </div>
              )}
              <Button
                size="sm"
                variant="ghost"
                onClick={() => removeSection(section.id)}
                className="h-7 px-2 text-red-400 hover:text-red-300 hover:bg-red-500/10 text-[9px]"
              >
                <Trash className="w-3 h-3 mr-1" /> Remover seção
              </Button>
            </div>

            <PhotoGrid
              photos={section.photos}
              max={L.maxCustomPhotos}
              onAdd={(files) => handleAddCustom(section.id, files)}
              onRemove={(item) => removeCustom(section.id, item)}
              onReplace={(item, file) => replaceCustom(section.id, item, file)}
              onOpen={openLightbox}
              busy={busyKey === section.id}
              progressList={busyKey === section.id ? inProgress : []}
            />
          </div>
        ))}
      </div>

      {lightboxIndex !== null && flatPhotos.length > 0 && (
        <Lightbox
          items={flatPhotos}
          index={Math.min(lightboxIndex, flatPhotos.length - 1)}
          onClose={() => setLightboxIndex(null)}
          onNavigate={(dir) => {
            setLightboxIndex((cur) => {
              if (cur === null) return cur;
              const next = (cur + dir + flatPhotos.length) % flatPhotos.length;
              return next;
            });
          }}
        />
      )}
    </div>
  );
}

// ---------- Sub-componentes ----------

function PhotoBlock({
  title,
  icon,
  photos,
  max,
  onAdd,
  onRemove,
  onReplace,
  onOpen,
  busy,
  progressList,
}: {
  title: string;
  icon: React.ReactNode;
  photos: PhotoItem[];
  max: number;
  onAdd: (files: File[]) => void;
  onRemove: (item: PhotoItem) => void;
  onReplace: (item: PhotoItem, file: File) => void;
  onOpen: (url: string) => void;
  busy: boolean;
  progressList: { fileName: string; progress: number; error?: boolean }[];
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-black uppercase italic text-primary flex items-center gap-2">
          {icon} {title}
        </h4>
        <span className="text-[9px] text-muted-foreground">
          {photos.length}/{max}
        </span>
      </div>
      <PhotoGrid
        photos={photos}
        max={max}
        onAdd={onAdd}
        onRemove={onRemove}
        onReplace={onReplace}
        onOpen={onOpen}
        busy={busy}
        progressList={progressList}
      />
    </div>
  );
}

function PhotoGrid({
  photos,
  max,
  onAdd,
  onRemove,
  onReplace,
  onOpen,
  busy,
  progressList,
}: {
  photos: PhotoItem[];
  max: number;
  onAdd: (files: File[]) => void;
  onRemove: (item: PhotoItem) => void;
  onReplace: (item: PhotoItem, file: File) => void;
  onOpen: (url: string) => void;
  busy: boolean;
  progressList: { fileName: string; progress: number; error?: boolean }[];
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const replaceInputRef = useRef<HTMLInputElement>(null);
  const [replacingItem, setReplacingItem] = useState<PhotoItem | null>(null);
  const canAdd = photos.length < max;

  // Drag & drop
  const [isDragOver, setIsDragOver] = useState(false);
  const dragDepthRef = useRef(0);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragDepthRef.current = 0;
    setIsDragOver(false);
    if (!canAdd || busy) return;
    const files = Array.from(e.dataTransfer.files || []).filter((f) => f.type.startsWith('image/'));
    if (!files.length) {
      toast.error('Arraste apenas arquivos de imagem.');
      return;
    }
    onAdd(files);
  };

  const openReplacePicker = (item: PhotoItem) => {
    setReplacingItem(item);
    // Trigger em microtask para garantir o input existir
    setTimeout(() => replaceInputRef.current?.click(), 0);
  };

  return (
    <div className="space-y-3">
      <div
        onDragEnter={(e) => {
          e.preventDefault();
          dragDepthRef.current += 1;
          if (canAdd && !busy) setIsDragOver(true);
        }}
        onDragOver={(e) => {
          e.preventDefault();
          if (canAdd && !busy) e.dataTransfer.dropEffect = 'copy';
        }}
        onDragLeave={(e) => {
          e.preventDefault();
          dragDepthRef.current = Math.max(0, dragDepthRef.current - 1);
          if (dragDepthRef.current === 0) setIsDragOver(false);
        }}
        onDrop={handleDrop}
        className={`relative grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 p-3 rounded-2xl border-2 border-dashed transition-all ${
          isDragOver
            ? 'border-primary bg-primary/10 ring-2 ring-primary/40'
            : 'border-white/10 bg-black/20'
        }`}
      >
        {photos.map((item) => {
          const url = getUrl(item);
          const thumb = getThumb(item);
          return (
            <div
              key={url}
              className="relative aspect-square rounded-xl overflow-hidden group border border-white/10 bg-black/40"
            >
              <button
                type="button"
                onClick={() => onOpen(url)}
                className="w-full h-full block"
                title="Expandir"
              >
                <SmartImage src={url} fallbackSrc={thumb} className="w-full h-full object-cover" />
              </button>
              <div className="absolute inset-x-0 bottom-0 flex items-center justify-between px-2 py-1.5 bg-gradient-to-t from-black/80 to-transparent opacity-0 group-hover:opacity-100 transition">
                <button
                  onClick={() => onOpen(url)}
                  className="w-6 h-6 rounded-full bg-black/60 text-white/90 hover:text-primary flex items-center justify-center"
                  title="Expandir"
                >
                  <Expand className="w-3 h-3" />
                </button>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => openReplacePicker(item)}
                    className="w-6 h-6 rounded-full bg-black/60 text-white/90 hover:text-primary flex items-center justify-center"
                    title="Substituir"
                  >
                    <RefreshCw className="w-3 h-3" />
                  </button>
                  <button
                    onClick={() => onRemove(item)}
                    className="w-6 h-6 rounded-full bg-black/60 text-red-400 hover:text-red-300 flex items-center justify-center"
                    title="Remover"
                  >
                    <Trash className="w-3 h-3" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}

        {canAdd && (
          <label
            className={`aspect-square rounded-xl border border-white/5 bg-white/5 flex flex-col items-center justify-center gap-1 cursor-pointer hover:bg-white/10 transition ${
              busy ? 'opacity-60 pointer-events-none' : ''
            }`}
          >
            <input
              ref={inputRef}
              type="file"
              className="hidden"
              accept="image/jpeg,image/png,image/webp,image/avif,image/gif"
              multiple
              onChange={(e) => {
                const files = Array.from(e.target.files || []);
                if (files.length) onAdd(files);
                if (inputRef.current) inputRef.current.value = '';
              }}
            />
            <PlusCircle className="w-5 h-5 text-muted-foreground" />
            <span className="text-[8px] font-black uppercase text-muted-foreground tracking-tighter text-center px-1">
              {busy ? 'Enviando...' : 'Add / Arraste'}
            </span>
          </label>
        )}

        {isDragOver && (
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center rounded-2xl">
            <div className="px-4 py-2 bg-primary text-black text-[10px] font-black uppercase italic rounded-lg shadow-lg">
              Solte para enviar
            </div>
          </div>
        )}

        <input
          ref={replaceInputRef}
          type="file"
          className="hidden"
          accept="image/jpeg,image/png,image/webp,image/avif,image/gif"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file && replacingItem) onReplace(replacingItem, file);
            setReplacingItem(null);
            if (replaceInputRef.current) replaceInputRef.current.value = '';
          }}
        />
      </div>

      {progressList.length > 0 && (
        <div className="space-y-1.5">
          {progressList.map((p) => (
            <div key={p.fileName} className="space-y-1">
              <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                <span className="truncate max-w-[70%]">{p.fileName}</span>
                <span>{p.error ? 'Erro' : `${p.progress}%`}</span>
              </div>
              <div className="h-1 bg-white/10 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all ${p.error ? 'bg-red-500' : 'bg-primary'}`}
                  style={{ width: `${p.progress}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ---------- SmartImage: fallback AVIF -> thumb (WEBP/PNG) ----------
function SmartImage({
  src,
  fallbackSrc,
  className,
  alt = '',
}: {
  src: string;
  fallbackSrc?: string;
  className?: string;
  alt?: string;
}) {
  const [current, setCurrent] = useState(src);
  const triedFallback = useRef(false);
  useEffect(() => {
    triedFallback.current = false;
    setCurrent(src);
  }, [src]);
  return (
    <img
      src={current}
      alt={alt}
      loading="lazy"
      decoding="async"
      className={className}
      onError={() => {
        if (!triedFallback.current && fallbackSrc && fallbackSrc !== current) {
          triedFallback.current = true;
          setCurrent(fallbackSrc);
        }
      }}
    />
  );
}

// ---------- Lightbox ----------
function Lightbox({
  items,
  index,
  onClose,
  onNavigate,
}: {
  items: { url: string; thumb: string; sectionName: string }[];
  index: number;
  onClose: () => void;
  onNavigate: (dir: 1 | -1) => void;
}) {
  const current = items[index];

  const handleKey = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      else if (e.key === 'ArrowRight') onNavigate(1);
      else if (e.key === 'ArrowLeft') onNavigate(-1);
    },
    [onClose, onNavigate],
  );
  useEffect(() => {
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [handleKey]);

  if (!current) return null;

  return (
    <div
      className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-sm flex items-center justify-center"
      onClick={onClose}
    >
      <button
        onClick={(e) => {
          e.stopPropagation();
          onClose();
        }}
        className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center"
        title="Fechar"
      >
        <X className="w-5 h-5" />
      </button>

      <button
        onClick={(e) => {
          e.stopPropagation();
          onNavigate(-1);
        }}
        className="absolute left-4 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center"
        title="Anterior"
      >
        <ChevronLeft className="w-6 h-6" />
      </button>
      <button
        onClick={(e) => {
          e.stopPropagation();
          onNavigate(1);
        }}
        className="absolute right-4 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center"
        title="Próxima"
      >
        <ChevronRight className="w-6 h-6" />
      </button>

      <div
        className="max-w-[92vw] max-h-[86vh] flex flex-col items-center gap-3"
        onClick={(e) => e.stopPropagation()}
      >
        <SmartImage
          src={current.url}
          fallbackSrc={current.thumb}
          className="max-w-[92vw] max-h-[78vh] object-contain rounded-xl"
        />
        <div className="flex items-center gap-3 text-[10px] uppercase font-black italic tracking-wider text-white/80">
          <span className="px-2 py-1 rounded-md bg-primary/20 text-primary">{current.sectionName}</span>
          <span>
            {index + 1} / {items.length}
          </span>
        </div>
      </div>
    </div>
  );
}
