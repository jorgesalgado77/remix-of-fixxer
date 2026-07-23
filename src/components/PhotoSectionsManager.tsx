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
  GripVertical,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { useMediaUpload } from '@/hooks/use-media-upload';
import { processImage } from '@/utils/image-compression';
import { validateImage } from '@/utils/image-validation';
import { supabaseExternal } from '@/lib/supabaseExternal';
import { ImageEditorModal } from '@/components/ImageEditorModal';
import {
  DndContext,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  closestCenter,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  rectSortingStrategy,
  sortableKeyboardCoordinates,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

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
  imgMaxMB: number;
  sectionTotalMaxMB: number;
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

  // Editor de imagem (fila de arquivos para rotacionar/recortar antes do upload)
  const [editorFiles, setEditorFiles] = useState<File[] | null>(null);
  const editorTargetRef = useRef<((files: File[]) => Promise<void>) | null>(null);

  const openEditor = (files: File[], onConfirm: (edited: File[]) => Promise<void>) => {
    if (!files.length) return;
    editorTargetRef.current = onConfirm;
    setEditorFiles(files);
  };

  // Lightbox global
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
    const list = files.slice(0, remaining);
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

  // -------- add handlers (abrem editor primeiro) --------
  const handleAddShowroom = (files: File[]) => {
    openEditor(files, async (edited) => {
      setBusyKey('showroom');
      const urls = await uploadImages(edited, 'showroom', L.maxShowroom, safe.showroom);
      if (urls.length) onChange({ ...safe, showroom: [...safe.showroom, ...urls] });
      setBusyKey(null);
    });
  };
  const handleAddAssemblies = (files: File[]) => {
    openEditor(files, async (edited) => {
      setBusyKey('assemblies');
      const urls = await uploadImages(edited, 'assemblies', L.maxAssemblies, safe.assemblies);
      if (urls.length) onChange({ ...safe, assemblies: [...safe.assemblies, ...urls] });
      setBusyKey(null);
    });
  };
  const handleAddCustom = (sectionId: string, files: File[]) => {
    openEditor(files, async (edited) => {
      const section = safe.custom.find((s) => s.id === sectionId);
      if (!section) return;
      setBusyKey(sectionId);
      const urls = await uploadImages(edited, `custom-${sectionId}`, L.maxCustomPhotos, section.photos);
      if (urls.length) {
        onChange({
          ...safe,
          custom: safe.custom.map((s) => (s.id === sectionId ? { ...s, photos: [...s.photos, ...urls] } : s)),
        });
      }
      setBusyKey(null);
    });
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

  // -------- reorder handlers --------
  const reorderShowroom = (next: PhotoItem[]) => onChange({ ...safe, showroom: next });
  const reorderAssemblies = (next: PhotoItem[]) => onChange({ ...safe, assemblies: next });
  const reorderCustom = (sectionId: string, next: PhotoItem[]) =>
    onChange({
      ...safe,
      custom: safe.custom.map((s) => (s.id === sectionId ? { ...s, photos: next } : s)),
    });

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
  const errorList = uploadProgress.filter((p) => p.error);

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
        onReorder={reorderShowroom}
        onOpen={openLightbox}
        busy={busyKey === 'showroom'}
        progressList={busyKey === 'showroom' ? [...inProgress, ...errorList] : []}
      />
      <PhotoBlock
        title="Montagens Realizadas"
        icon={<ImageIcon className="w-3 h-3 text-primary" />}
        photos={safe.assemblies}
        max={L.maxAssemblies}
        onAdd={handleAddAssemblies}
        onRemove={removeAssemblies}
        onReplace={replaceAssemblies}
        onReorder={reorderAssemblies}
        onOpen={openLightbox}
        busy={busyKey === 'assemblies'}
        progressList={busyKey === 'assemblies' ? [...inProgress, ...errorList] : []}
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
              onReorder={(next) => reorderCustom(section.id, next)}
              onOpen={openLightbox}
              busy={busyKey === section.id}
              progressList={busyKey === section.id ? [...inProgress, ...errorList] : []}
            />
          </div>
        ))}
      </div>

      {editorFiles && (
        <ImageEditorModal
          files={editorFiles}
          onDone={async (edited) => {
            const target = editorTargetRef.current;
            setEditorFiles(null);
            editorTargetRef.current = null;
            if (target && edited.length) await target(edited);
          }}
          onCancel={() => {
            setEditorFiles(null);
            editorTargetRef.current = null;
          }}
        />
      )}

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
          onJump={(target) => {
            setLightboxIndex(target);
          }}
        />
      )}
    </div>
  );
}

// ---------- Sub-componentes ----------

function PhotoBlock(props: {
  title: string;
  icon: React.ReactNode;
  photos: PhotoItem[];
  max: number;
  onAdd: (files: File[]) => void;
  onRemove: (item: PhotoItem) => void;
  onReplace: (item: PhotoItem, file: File) => void;
  onReorder: (next: PhotoItem[]) => void;
  onOpen: (url: string) => void;
  busy: boolean;
  progressList: { fileName: string; progress: number; error?: boolean }[];
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-black uppercase italic text-primary flex items-center gap-2">
          {props.icon} {props.title}
        </h4>
        <span className="text-[9px] text-muted-foreground">
          {props.photos.length}/{props.max}
        </span>
      </div>
      <PhotoGrid {...props} />
    </div>
  );
}

function PhotoGrid({
  photos,
  max,
  onAdd,
  onRemove,
  onReplace,
  onReorder,
  onOpen,
  busy,
  progressList,
}: {
  photos: PhotoItem[];
  max: number;
  onAdd: (files: File[]) => void;
  onRemove: (item: PhotoItem) => void;
  onReplace: (item: PhotoItem, file: File) => void;
  onReorder: (next: PhotoItem[]) => void;
  onOpen: (url: string) => void;
  busy: boolean;
  progressList: { fileName: string; progress: number; error?: boolean }[];
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const replaceInputRef = useRef<HTMLInputElement>(null);
  const [replacingItem, setReplacingItem] = useState<PhotoItem | null>(null);
  const canAdd = photos.length < max;

  const [isDragOver, setIsDragOver] = useState(false);
  const dragDepthRef = useRef(0);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

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
    setTimeout(() => replaceInputRef.current?.click(), 0);
  };

  const ids = photos.map((p) => getUrl(p));
  const onDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const oldIndex = ids.indexOf(String(active.id));
    const newIndex = ids.indexOf(String(over.id));
    if (oldIndex < 0 || newIndex < 0) return;
    onReorder(arrayMove(photos, oldIndex, newIndex));
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
        className={`relative rounded-2xl border-2 border-dashed transition-all p-3 ${
          isDragOver
            ? 'border-primary bg-primary/10 ring-2 ring-primary/40'
            : 'border-white/10 bg-black/20'
        }`}
      >
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
          <SortableContext items={ids} strategy={rectSortingStrategy}>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
              {photos.map((item) => (
                <SortablePhoto
                  key={getUrl(item)}
                  id={getUrl(item)}
                  item={item}
                  onOpen={onOpen}
                  onReplace={openReplacePicker}
                  onRemove={onRemove}
                />
              ))}

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
            </div>
          </SortableContext>
        </DndContext>

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
        <div className="space-y-1.5" role="status" aria-live="polite">
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

function SortablePhoto({
  id,
  item,
  onOpen,
  onReplace,
  onRemove,
}: {
  id: string;
  item: PhotoItem;
  onOpen: (url: string) => void;
  onReplace: (item: PhotoItem) => void;
  onRemove: (item: PhotoItem) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const url = getUrl(item);
  const thumb = getThumb(item);
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 20 : undefined,
    opacity: isDragging ? 0.85 : 1,
  };
  return (
    <div
      ref={setNodeRef}
      style={style}
      className="relative aspect-square rounded-xl overflow-hidden group border border-white/10 bg-black/40"
    >
      <button
        type="button"
        onClick={() => onOpen(url)}
        className="w-full h-full block"
        aria-label="Expandir foto"
      >
        <SmartImage src={url} fallbackSrc={thumb} className="w-full h-full object-cover" />
      </button>

      {/* Alça de arraste (para toque/teclado) */}
      <button
        type="button"
        {...attributes}
        {...listeners}
        aria-label="Arrastar para reordenar"
        className="absolute top-1.5 left-1.5 w-6 h-6 rounded-full bg-black/70 text-white/90 hover:text-primary flex items-center justify-center cursor-grab active:cursor-grabbing touch-none"
        title="Arrastar para reordenar"
      >
        <GripVertical className="w-3 h-3" />
      </button>

      <div className="absolute inset-x-0 bottom-0 flex items-center justify-between px-2 py-1.5 bg-gradient-to-t from-black/80 to-transparent opacity-0 group-hover:opacity-100 transition">
        <button
          onClick={() => onOpen(url)}
          className="w-6 h-6 rounded-full bg-black/60 text-white/90 hover:text-primary flex items-center justify-center"
          aria-label="Expandir foto"
          title="Expandir"
        >
          <Expand className="w-3 h-3" />
        </button>
        <div className="flex items-center gap-1">
          <button
            onClick={() => onReplace(item)}
            className="w-6 h-6 rounded-full bg-black/60 text-white/90 hover:text-primary flex items-center justify-center"
            aria-label="Substituir foto"
            title="Substituir"
          >
            <RefreshCw className="w-3 h-3" />
          </button>
          <button
            onClick={() => onRemove(item)}
            className="w-6 h-6 rounded-full bg-black/60 text-red-400 hover:text-red-300 flex items-center justify-center"
            aria-label="Remover foto"
            title="Remover"
          >
            <Trash className="w-3 h-3" />
          </button>
        </div>
      </div>
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

// ---------- Lightbox (com foco controlado, teclado completo e ARIA) ----------
function Lightbox({
  items,
  index,
  onClose,
  onNavigate,
  onJump,
}: {
  items: { url: string; thumb: string; sectionName: string }[];
  index: number;
  onClose: () => void;
  onNavigate: (dir: 1 | -1) => void;
  onJump: (target: number) => void;
}) {
  const current = items[index];
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeBtnRef = useRef<HTMLButtonElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const titleId = 'lightbox-title';
  const descId = 'lightbox-desc';

  const handleKey = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      } else if (e.key === 'ArrowRight' || e.key === 'PageDown') {
        e.preventDefault();
        onNavigate(1);
      } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
        e.preventDefault();
        onNavigate(-1);
      } else if (e.key === 'Home') {
        e.preventDefault();
        onJump(0);
      } else if (e.key === 'End') {
        e.preventDefault();
        onJump(items.length - 1);
      } else if (e.key === 'Tab') {
        // Foco preso dentro do diálogo
        const root = dialogRef.current;
        if (!root) return;
        const focusables = root.querySelectorAll<HTMLElement>(
          'button, [href], [tabindex]:not([tabindex="-1"])',
        );
        if (!focusables.length) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    },
    [onClose, onNavigate, onJump, items.length],
  );

  useEffect(() => {
    previousFocusRef.current = document.activeElement as HTMLElement | null;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    // foca o botão de fechar ao abrir
    setTimeout(() => closeBtnRef.current?.focus(), 0);
    window.addEventListener('keydown', handleKey);
    return () => {
      window.removeEventListener('keydown', handleKey);
      document.body.style.overflow = prevOverflow;
      previousFocusRef.current?.focus?.();
    };
  }, [handleKey]);

  if (!current) return null;

  return (
    <div
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      aria-describedby={descId}
      className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-sm flex items-center justify-center"
      onClick={onClose}
    >
      <h2 id={titleId} className="sr-only">
        Visualizador de fotos em tela cheia
      </h2>
      <p id={descId} className="sr-only">
        Use as setas para navegar, Home e End para ir ao início ou fim, Escape para fechar.
      </p>

      <button
        ref={closeBtnRef}
        onClick={(e) => {
          e.stopPropagation();
          onClose();
        }}
        aria-label="Fechar visualizador"
        className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-primary"
      >
        <X className="w-5 h-5" />
      </button>

      <button
        onClick={(e) => {
          e.stopPropagation();
          onNavigate(-1);
        }}
        aria-label="Foto anterior"
        className="absolute left-4 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-primary"
      >
        <ChevronLeft className="w-6 h-6" />
      </button>
      <button
        onClick={(e) => {
          e.stopPropagation();
          onNavigate(1);
        }}
        aria-label="Próxima foto"
        className="absolute right-4 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-primary"
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
          alt={`Foto ${index + 1} de ${items.length} — seção ${current.sectionName}`}
          className="max-w-[92vw] max-h-[78vh] object-contain rounded-xl"
        />
        <div
          className="flex items-center gap-3 text-[10px] uppercase font-black italic tracking-wider text-white/80"
          aria-live="polite"
        >
          <span className="px-2 py-1 rounded-md bg-primary/20 text-primary">{current.sectionName}</span>
          <span>
            {index + 1} / {items.length}
          </span>
        </div>
      </div>
    </div>
  );
}
