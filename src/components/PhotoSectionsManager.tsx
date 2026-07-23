import React, { useRef, useState } from 'react';
import { Camera, PlusCircle, Trash, Pencil, Check, X, Image as ImageIcon } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { useMediaUpload } from '@/hooks/use-media-upload';
import { processImage } from '@/utils/image-compression';
import { validateImage } from '@/utils/image-validation';

export type CustomPhotoSection = { id: string; name: string; photos: PhotoItem[] };
export type PhotoItem = { url: string; thumbUrl?: string } | string;
export type PhotoSectionsValue = {
  showroom: PhotoItem[];
  assemblies: PhotoItem[];
  custom: CustomPhotoSection[];
};

export const EMPTY_PHOTO_SECTIONS: PhotoSectionsValue = { showroom: [], assemblies: [], custom: [] };

const IMG_MAX_MB = 8;
const MAX_SHOWROOM = 20;
const MAX_ASSEMBLIES = 20;
const MAX_CUSTOM_SECTIONS = 5;
const MAX_CUSTOM_PHOTOS = 10;

const getUrl = (p: PhotoItem): string => (typeof p === 'string' ? p : p.url);
const getThumb = (p: PhotoItem): string => (typeof p === 'string' ? p : (p.thumbUrl || p.url));

interface Props {
  value: PhotoSectionsValue;
  onChange: (next: PhotoSectionsValue) => void;
}

export function PhotoSectionsManager({ value, onChange }: Props) {
  const safe: PhotoSectionsValue = {
    showroom: Array.isArray(value?.showroom) ? value.showroom : [],
    assemblies: Array.isArray(value?.assemblies) ? value.assemblies : [],
    custom: Array.isArray(value?.custom) ? value.custom : [],
  };
  const { uploadFileDetailed, uploadProgress } = useMediaUpload();
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');

  const uploadImages = async (files: File[], folder: string, limit: number, existing: PhotoItem[]): Promise<PhotoItem[]> => {
    const remaining = Math.max(0, limit - existing.length);
    if (remaining <= 0) {
      toast.error('Limite de fotos atingido nesta seção.');
      return [];
    }
    const list = files.slice(0, remaining);
    const uploaded: PhotoItem[] = [];
    for (const original of list) {
      const check = validateImage(original, IMG_MAX_MB * 1024 * 1024);
      if (!check.ok) {
        toast.error('Arquivo não aceito', { description: check.error });
        continue;
      }
      let processed;
      try { processed = await processImage(original, { maxWidth: 1600, quality: 0.82 }); }
      catch (err) {
        console.warn('processImage falhou, usando original:', err);
        processed = { file: original, mime: check.mime, ext: check.ext, width: 0, height: 0 };
      }
      const res = await uploadFileDetailed(processed.file, {
        bucket: 'media',
        folder,
        contentType: processed.mime,
        generateThumb: true,
      });
      if (res) uploaded.push({ url: res.url, thumbUrl: res.thumbUrl });
    }
    if (files.length > remaining) {
      toast.warning(`Somente ${remaining} foto(s) foram enviadas — limite da seção atingido.`);
    }
    return uploaded;
  };


  const handleAddShowroom = async (files: File[]) => {
    setBusyKey('showroom');
    const urls = await uploadImages(files, 'showroom', MAX_SHOWROOM, safe.showroom);
    if (urls.length) onChange({ ...safe, showroom: [...safe.showroom, ...urls] });
    setBusyKey(null);
  };
  const handleAddAssemblies = async (files: File[]) => {
    setBusyKey('assemblies');
    const urls = await uploadImages(files, 'assemblies', MAX_ASSEMBLIES, safe.assemblies);
    if (urls.length) onChange({ ...safe, assemblies: [...safe.assemblies, ...urls] });
    setBusyKey(null);
  };
  const handleAddCustom = async (sectionId: string, files: File[]) => {
    const section = safe.custom.find(s => s.id === sectionId);
    if (!section) return;
    setBusyKey(sectionId);
    const urls = await uploadImages(files, `custom-${sectionId}`, MAX_CUSTOM_PHOTOS, section.photos);
    if (urls.length) {
      onChange({
        ...safe,
        custom: safe.custom.map(s => s.id === sectionId ? { ...s, photos: [...s.photos, ...urls] } : s),
      });
    }
    setBusyKey(null);
  };

  const removeShowroom = (item: PhotoItem) => onChange({ ...safe, showroom: safe.showroom.filter(p => getUrl(p) !== getUrl(item)) });
  const removeAssemblies = (item: PhotoItem) => onChange({ ...safe, assemblies: safe.assemblies.filter(p => getUrl(p) !== getUrl(item)) });
  const removeCustom = (sectionId: string, item: PhotoItem) => onChange({
    ...safe,
    custom: safe.custom.map(s => s.id === sectionId ? { ...s, photos: s.photos.filter(p => getUrl(p) !== getUrl(item)) } : s),
  });

  const addSection = () => {
    if (safe.custom.length >= MAX_CUSTOM_SECTIONS) {
      toast.error(`Limite de ${MAX_CUSTOM_SECTIONS} seções personalizadas atingido.`);
      return;
    }
    const id = `sec_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const next = { ...safe, custom: [...safe.custom, { id, name: 'Nova Seção', photos: [] }] };
    onChange(next);
    setEditingId(id);
    setEditingName('Nova Seção');
  };
  const removeSection = (id: string) => {
    onChange({ ...safe, custom: safe.custom.filter(s => s.id !== id) });
  };
  const saveSectionName = (id: string) => {
    const name = editingName.trim() || 'Seção sem nome';
    onChange({ ...safe, custom: safe.custom.map(s => s.id === id ? { ...s, name } : s) });
    setEditingId(null);
    setEditingName('');
  };

  const inProgress = uploadProgress.filter(p => !p.error && p.progress < 100);

  return (
    <div className="space-y-8 pt-6 border-t border-white/5">
      <PhotoBlock
        title="Fotos do Show Room"
        icon={<Camera className="w-3 h-3 text-primary" />}
        photos={safe.showroom}
        max={MAX_SHOWROOM}
        onAdd={handleAddShowroom}
        onRemove={removeShowroom}
        busy={busyKey === 'showroom'}
        progressList={busyKey === 'showroom' ? inProgress : []}
      />
      <PhotoBlock
        title="Montagens Realizadas"
        icon={<ImageIcon className="w-3 h-3 text-primary" />}
        photos={safe.assemblies}
        max={MAX_ASSEMBLIES}
        onAdd={handleAddAssemblies}
        onRemove={removeAssemblies}
        busy={busyKey === 'assemblies'}
        progressList={busyKey === 'assemblies' ? inProgress : []}
      />

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-xs font-black uppercase italic text-primary">Seções Personalizadas</h4>
            <p className="text-[10px] text-muted-foreground mt-1">
              Crie até {MAX_CUSTOM_SECTIONS} seções nomeadas (ex.: Cozinhas, Dormitórios) — {MAX_CUSTOM_PHOTOS} fotos cada.
            </p>
          </div>
          <Button
            onClick={addSection}
            disabled={safe.custom.length >= MAX_CUSTOM_SECTIONS}
            className="h-8 bg-primary text-black font-black uppercase italic text-[10px] rounded-xl hover:bg-primary/90 disabled:opacity-40"
          >
            <PlusCircle className="w-3 h-3 mr-1.5" /> Nova Seção ({safe.custom.length}/{MAX_CUSTOM_SECTIONS})
          </Button>
        </div>

        {safe.custom.map(section => (
          <div key={section.id} className="rounded-2xl border border-white/10 bg-black/20 p-4 space-y-3">
            <div className="flex items-center justify-between gap-2">
              {editingId === section.id ? (
                <div className="flex items-center gap-2 flex-1">
                  <Input
                    autoFocus
                    value={editingName}
                    onChange={(e) => setEditingName(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') saveSectionName(section.id); }}
                    placeholder="Ex.: Cozinhas"
                    className="h-9 bg-black/40 border-white/10 rounded-lg text-xs"
                  />
                  <Button size="sm" onClick={() => saveSectionName(section.id)} className="h-9 px-3 bg-primary text-black rounded-lg">
                    <Check className="w-3 h-3" />
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => { setEditingId(null); setEditingName(''); }} className="h-9 px-3">
                    <X className="w-3 h-3" />
                  </Button>
                </div>
              ) : (
                <div className="flex items-center gap-2 flex-1">
                  <span className="text-xs font-black uppercase italic text-white">{section.name}</span>
                  <span className="text-[9px] text-muted-foreground">({section.photos.length}/{MAX_CUSTOM_PHOTOS})</span>
                  <Button
                    size="sm" variant="ghost"
                    onClick={() => { setEditingId(section.id); setEditingName(section.name); }}
                    className="h-7 px-2 text-[9px] text-muted-foreground hover:text-white"
                  >
                    <Pencil className="w-3 h-3 mr-1" /> Renomear
                  </Button>
                </div>
              )}
              <Button
                size="sm" variant="ghost" onClick={() => removeSection(section.id)}
                className="h-7 px-2 text-red-400 hover:text-red-300 hover:bg-red-500/10 text-[9px]"
              >
                <Trash className="w-3 h-3 mr-1" /> Remover seção
              </Button>
            </div>

            <PhotoGrid
              photos={section.photos}
              max={MAX_CUSTOM_PHOTOS}
              onAdd={(files) => handleAddCustom(section.id, files)}
              onRemove={(item) => removeCustom(section.id, item)}
              busy={busyKey === section.id}
              progressList={busyKey === section.id ? inProgress : []}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

function PhotoBlock({
  title, icon, photos, max, onAdd, onRemove, busy, progressList,
}: {
  title: string;
  icon: React.ReactNode;
  photos: PhotoItem[];
  max: number;
  onAdd: (files: File[]) => void;
  onRemove: (item: PhotoItem) => void;
  busy: boolean;
  progressList: { fileName: string; progress: number; error?: boolean }[];
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-black uppercase italic text-primary flex items-center gap-2">
          {icon} {title}
        </h4>
        <span className="text-[9px] text-muted-foreground">{photos.length}/{max}</span>
      </div>
      <PhotoGrid photos={photos} max={max} onAdd={onAdd} onRemove={onRemove} busy={busy} progressList={progressList} />
    </div>
  );
}

function PhotoGrid({
  photos, max, onAdd, onRemove, busy, progressList,
}: {
  photos: PhotoItem[];
  max: number;
  onAdd: (files: File[]) => void;
  onRemove: (item: PhotoItem) => void;
  busy: boolean;
  progressList: { fileName: string; progress: number; error?: boolean }[];
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const canAdd = photos.length < max;
  const renderFallback = (e: React.SyntheticEvent<HTMLImageElement>) => {
    e.currentTarget.style.opacity = '0.3';
  };

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 p-3 rounded-2xl border-2 border-dashed border-white/10 bg-black/20">
        {photos.map((item) => {
          const url = getUrl(item);
          const thumb = getThumb(item);
          return (
            <div key={url} className="relative aspect-square rounded-xl overflow-hidden group border border-white/10">
              <img
                src={thumb}
                alt=""
                className="w-full h-full object-cover"
                loading="lazy"
                decoding="async"
                onError={renderFallback}
              />
              <button
                onClick={() => onRemove(item)}
                className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-black/70 text-red-400 opacity-0 group-hover:opacity-100 transition flex items-center justify-center"
                title="Remover"
              >
                <Trash className="w-3 h-3" />
              </button>
            </div>
          );
        })}
        {canAdd && (
          <label className={`aspect-square rounded-xl border border-white/5 bg-white/5 flex flex-col items-center justify-center gap-1 cursor-pointer hover:bg-white/10 transition ${busy ? 'opacity-60 pointer-events-none' : ''}`}>
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
            <span className="text-[8px] font-black uppercase text-muted-foreground tracking-tighter">
              {busy ? 'Enviando...' : 'Add Foto'}
            </span>
          </label>
        )}
      </div>
      {progressList.length > 0 && (
        <div className="space-y-1.5">
          {progressList.map(p => (
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

