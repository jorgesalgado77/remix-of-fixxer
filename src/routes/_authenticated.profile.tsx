import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect, useMemo, useRef } from "react";
import { supabaseExternal } from "@/lib/supabaseExternal";
import { toast } from "sonner";
import { Loader2, Camera, MapPin, Save, User, Star, BadgeCheck, Upload, Trash2, Plus, Search, Building, Briefcase, FileText, File, FileSpreadsheet, Play, X, ChevronLeft, ChevronRight, MessageSquare, ExternalLink } from "lucide-react";
import { compressImage } from "@/utils/image-compression";
import { MaskedInput, applyCepMask } from "@/components/MaskedInput";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogAction,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";

// Normaliza campos que devem persistir mascarados (ex.: CEP)
function normalizeMasks(p: any): any {
  if (!p) return p;
  const out = { ...p };
  if (out.cep) out.cep = applyCepMask(String(out.cep));
  return out;
}

// Helpers para computar itens extras (além da cota do plano)
function parseCsvList(v?: string | null): string[] {
  return String(v ?? "").split("||").map((s) => s.trim()).filter(Boolean);
}
function quotaForPlan(plan?: string | null): number {
  const p = String(plan || "free").toLowerCase();
  if (p === "premium") return 5;
  if (p === "pro" || p === "basico") return 3;
  return 1;
}
const EXTRA_ITEM_COST = 15;
import { getCategoryTheme, type CategoryKey } from "@/lib/category-colors";
import { PushToggle } from "@/components/PushToggle";
import { AffiliateBanner } from "@/components/AffiliateBanner";
import { ActivityBranchSelector } from "@/components/ActivityBranchSelector";
import { ActivityBranchPicker } from "@/components/ActivityBranchPicker";
import { PreferredServicePicker } from "@/components/PreferredServicePicker";
import { OfferingsPicker } from "@/components/OfferingsPicker";
import { SpecialtiesEditor, type Specialty } from "@/components/SpecialtiesEditor";
import { ALLOWED_RADII_KM, isAllowedRadius, BIO_MAX_LENGTH } from "@/lib/branch-search";
import { CoinBalanceBadge } from "@/components/CoinBalanceBadge";
import { PlanBadge } from "@/components/PlanBadge";
import { LiveProfilePreview } from "@/components/LiveProfilePreview";
import { AutosaveStatusPill } from "@/components/AutosaveStatusPill";
import { saveDraft, loadDraft, clearDraft, markPending, pickDraftPatch } from "@/lib/profile-draft";
import { detectPixKeyType, validatePixKey, PIX_KEY_TYPE_LABELS, type PixKeyType } from "@/lib/pix-key";
import { uploadProfileDocument, resolveDocumentUrl, deleteProfileDocument } from "@/lib/profile-documents";

function roleToCategory(role?: string | null): CategoryKey {
  const r = (role || "").toLowerCase();
  if (r === "admin") return "admin";
  if (r === "lojista") return "lojista";
  if (r === "prestador") return "prestador";
  if (r === "parceiro" || r === "fornecedor") return "fornecedor";
  if (r === "cliente" || r === "casual") return "cliente";
  return "cliente";
}


export const Route = createFileRoute("/_authenticated/profile")({
  validateSearch: (search: Record<string, unknown>) => {
    return {
      id: search.id as string | undefined,
      context: search.context as string | undefined,
      focus: search.focus as string | undefined,
    };
  },
  component: ProfilePage,
});

// ================= LIMITES E FORMATOS DE UPLOAD (visíveis na UI) =================
const UPLOAD_LIMITS = {
  image: {
    maxBytes: 5 * 1024 * 1024,
    maxLabel: '5 MB',
    accept: ['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/gif'],
    acceptAttr: 'image/*',
    hint: 'JPG, PNG, WEBP, AVIF ou GIF',
  },
  video: {
    maxBytes: 50 * 1024 * 1024,
    maxLabel: '50 MB',
    accept: ['video/mp4', 'video/webm', 'video/quicktime'],
    acceptAttr: 'video/*',
    hint: 'MP4, WEBM ou MOV',
  },
  document: {
    maxBytes: 10 * 1024 * 1024,
    maxLabel: '10 MB',
    accept: [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'text/plain',
    ],
    acceptAttr: '.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,image/*',
    hint: 'PDF, DOC, DOCX, XLS, XLSX, PPT, PPTX ou TXT',
  },
} as const;

function validateFileForType(
  file: File,
  type: 'image' | 'video' | 'document'
): { ok: true } | { ok: false; reason: string } {
  const cfg = UPLOAD_LIMITS[type];
  const isImageOnDoc = type === 'document' && file.type.startsWith('image/');
  if (!(cfg.accept as readonly string[]).includes(file.type) && !isImageOnDoc) {
    return { ok: false, reason: `Formato não aceito (${file.type || 'desconhecido'}). Envie: ${cfg.hint}.` };
  }
  if (file.size > cfg.maxBytes) {
    const mb = (file.size / (1024 * 1024)).toFixed(1);
    return { ok: false, reason: `Arquivo muito grande (${mb} MB). Limite: ${cfg.maxLabel}.` };
  }
  return { ok: true };
}


/**
 * Card de documento privado. Resolve a URL sob demanda:
 * - se o item tem `path`, gera `signedUrl` (válida por 1h) do bucket privado;
 * - se tem só `url` (legado público), usa como está.
 * A URL nunca é persistida — se expirar, o próximo mount gera nova.
 */
function DocItem(props: {
  doc: any;
  index: number;
  total: number;
  onDragStart: () => void;
  onDrop: () => void;
  onReorderKey: (ev: React.KeyboardEvent, kind: 'image'|'pdf'|'other', url: string) => void;
  onPreview: (url: string, kind: 'image'|'pdf'|'other') => void;
  onRemove: () => void;
}) {
  const { doc, index, total, onDragStart, onDrop, onReorderKey, onPreview, onRemove } = props;
  const ext = (doc?.name?.split('.').pop() || '').toLowerCase();
  const isPdf = ext === 'pdf';
  const isImg = ['png','jpg','jpeg','webp','gif','avif','svg'].includes(ext);
  const kind: 'image'|'pdf'|'other' = isImg ? 'image' : isPdf ? 'pdf' : 'other';
  const [url, setUrl] = useState<string>('');
  const source = doc?.path || doc?.url || '';

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const resolved = await resolveDocumentUrl(source);
      if (!cancelled) setUrl(resolved);
    })();
    return () => { cancelled = true; };
  }, [source]);

  return (
    <div
      role="listitem"
      tabIndex={0}
      aria-label={`Documento ${index + 1} de ${total}: ${doc.name}. Use setas para reordenar, Enter para pré-visualizar.`}
      draggable
      onDragStart={onDragStart}
      onDragOver={(ev) => ev.preventDefault()}
      onDrop={(ev) => { ev.preventDefault(); onDrop(); }}
      onKeyDown={(ev) => onReorderKey(ev, kind, url)}
      className="flex items-center justify-between p-3 bg-white/5 rounded-xl border border-white/5 group hover:border-primary/30 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:border-primary transition-all cursor-grab active:cursor-grabbing"
    >
      <div className="flex items-center gap-3 overflow-hidden">
        <button
          type="button"
          onClick={() => url && onPreview(url, kind)}
          className="w-12 h-12 rounded-lg flex-shrink-0 overflow-hidden border border-white/10 bg-black/40 flex items-center justify-center relative"
          title={`Pré-visualizar ${doc.name}`}
          aria-label={`Pré-visualizar ${doc.name}`}
        >
          {isImg && url ? (
            <img src={url} alt={doc.name} className="w-full h-full object-cover" loading="lazy" />
          ) : isPdf && url ? (
            <>
              <embed src={`${url}#toolbar=0&navpanes=0&scrollbar=0&view=Fit`} type="application/pdf" className="w-full h-full pointer-events-none" />
              <span className="absolute bottom-0 left-0 right-0 text-[7px] font-black text-center bg-red-500/90 text-white uppercase">PDF</span>
            </>
          ) : (
            <>
              <File className="w-5 h-5 text-primary" />
              <span className="absolute bottom-0 left-0 right-0 text-[7px] font-black text-center bg-primary/80 text-black uppercase truncate">{ext || 'DOC'}</span>
            </>
          )}
        </button>
        <div className="truncate">
          <p className="text-[11px] font-bold text-white truncate">{doc.name}</p>
          <p className="text-[9px] text-muted-foreground uppercase">{doc.size || 'N/A'}</p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => url && onPreview(url, kind)}
          className="text-muted-foreground hover:text-primary transition-colors"
          title="Pré-visualizar"
          aria-label="Pré-visualizar"
        >
          <Search className="w-4 h-4" />
        </button>
        <a
          href={url || '#'}
          target="_blank"
          rel="noreferrer"
          onClick={(e) => { if (!url) e.preventDefault(); }}
          className="text-muted-foreground hover:text-primary transition-colors"
          title="Abrir em nova aba"
        >
          <ExternalLink className="w-4 h-4" />
        </a>
        <button
          type="button"
          onClick={onRemove}
          className="text-muted-foreground hover:text-red-500 transition-colors"
          title="Remover"
          aria-label="Remover documento"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

function ProfilePage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingSocial, setSavingSocial] = useState(false);
  const [autoSaving, setAutoSaving] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<number | null>(null);
  const [profile, setProfile] = useState<any>(null);
  const [brands, setBrands] = useState<string[]>([]);
  const [newBrand, setNewBrand] = useState("");
  const [isAddingBrand, setIsAddingBrand] = useState(false);
  const [productTypes, setProductTypes] = useState<string[]>(["Fabricação Própria", "Revenda", "Serviços"]);
  const [newProductType, setNewProductType] = useState("");
  const [isAddingProductType, setIsAddingProductType] = useState(false);
  const [lightbox, setLightbox] = useState<{ isOpen: boolean; type: string; url: string; index: number }>({ isOpen: false, type: '', url: '', index: 0 });
  const [uploads, setUploads] = useState<Array<{ id: string; name: string; type: 'image'|'video'|'document'; status: 'uploading'|'success'|'error'; error?: string; file?: File }>>([]);
  const [preview, setPreview] = useState<{ open: boolean; url: string; name: string; kind: 'image'|'video'|'pdf'|'other' }>({ open: false, url: '', name: '', kind: 'other' });
  const dragRef = useRef<{ list: 'doc'|'image'|'video'; index: number } | null>(null);

  const lastSavedSnapshotRef = useRef<string>('');
  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);


  const { id: profileId, context: postId, focus: focusField } = Route.useSearch() as { id?: string; context?: string; focus?: string };
  const [targetPost, setTargetPost] = useState<any>(null);

  useEffect(() => {
    async function loadData() {
      const { data: { user } } = await supabaseExternal.auth.getUser();
      
      // Se tiver ID na URL, carrega esse perfil. Se não, carrega o do usuário logado.
      const idToLoad = profileId || user?.id;
      if (!idToLoad) return;

      const [profileRes, brandsRes, productTypesRes, postRes] = await Promise.all([
        supabaseExternal.from('profiles').select('*').eq('id', idToLoad).single(),
        supabaseExternal.from('brand_flags').select('name').order('name', { ascending: true }),
        supabaseExternal.from('product_types').select('name').order('name', { ascending: true }),
        postId ? supabaseExternal.from('feed_posts').select('*').eq('id', postId).single() : Promise.resolve({ data: null })
      ]);
      
      if (profileRes.data) {
        let merged: any = profileRes.data;
        // Reidrata campos "extras" persistidos em custom_sections.__extras
        // (campos que ainda não existem como coluna própria na tabela `profiles`).
        try {
          const extras = (merged?.custom_sections as any)?.__extras;
          if (extras && typeof extras === 'object') {
            // extras não sobrescreve valores já vindos como colunas do banco
            merged = { ...extras, ...merged };
          }
        } catch { /* noop */ }
        // Recupera rascunho offline (não aplica em perfis públicos de terceiros)
        if (!profileId) {
          try {
            const draft = loadDraft(idToLoad);
            const patch = pickDraftPatch(profileRes.data, draft);
            if (patch) {
              merged = { ...merged, ...patch };
              toast.info("Rascunho recuperado do dispositivo.", {
                description: draft?.pending
                  ? "Você tinha alterações pendentes — clique em Salvar para reenviar."
                  : "Restauramos suas edições não salvas.",
              });
            }
          } catch { /* noop */ }
        }
        merged = normalizeMasks(merged);
        setProfile(merged);
        lastSavedSnapshotRef.current = JSON.stringify(merged);
        // Sincroniza raio de atuação salvo para uso como padrão nos feeds
        if (!profileId && merged.service_radius_km != null) {
          try {
            const cat = roleToCategory(merged.role);
            localStorage.setItem(`fixxer_radius_${cat}`, String(merged.service_radius_km));
          } catch { /* noop */ }
        }
      }
      if (brandsRes.data) setBrands(brandsRes.data.map(b => b.name));
      if (productTypesRes?.data && productTypesRes.data.length > 0) {
        const merged = Array.from(new Set([
          "Fabricação Própria", "Revenda", "Serviços",
          ...productTypesRes.data.map((p: any) => p.name),
        ]));
        setProductTypes(merged);
      }
      if (postRes?.data) setTargetPost(postRes.data);
      setLoading(false);
    }
    loadData();
  }, [profileId, postId]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'avatar' | 'banner') => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!profile?.id) {
      toast.error("Perfil não carregado. Recarregue a página.");
      return;
    }

    const toastId = toast.loading(`Enviando ${type === 'avatar' ? 'foto de perfil' : 'banner'}...`);
    try {
      let processed: File = file;
      try {
        processed = await compressImage(file, type === 'banner' ? 1600 : 800, 0.8);
      } catch (err) {
        console.warn("Compressão falhou, usando original:", err);
      }

      const fileExt = (file.name.split('.').pop() || 'jpg').toLowerCase();
      const filePath = `profiles/${profile.id}/${type}-${Date.now()}.${fileExt}`;

      let publicUrl: string | null = null;
      const { error: upErr } = await supabaseExternal.storage
        .from('media')
        .upload(filePath, processed, { upsert: true, cacheControl: '3600', contentType: processed.type || 'image/jpeg' });
      if (upErr) throw upErr;
      publicUrl = supabaseExternal.storage.from('media').getPublicUrl(filePath).data.publicUrl;

      const field = type === 'avatar' ? 'avatar_url' : 'banner_url';

      const { error } = await supabaseExternal.from('profiles').update({ [field]: publicUrl }).eq('id', profile.id);
      if (error) throw error;

      setProfile({ ...profile, [field]: publicUrl });
      toast.success(type === 'banner' ? "Banner atualizado!" : "Foto atualizada!", { id: toastId });
    } catch (error: any) {
      console.error("Upload error:", error);
      const msg = error?.message || String(error);
      toast.error(
        msg.includes('Bucket') || msg.includes('not found') || msg.includes('row-level')
          ? "Bucket 'media' não configurado. Crie um bucket público chamado 'media' no Supabase Storage."
          : "Erro no upload: " + msg,
        { id: toastId }
      );
    } finally {
      e.target.value = '';
    }
  };


  // Processa uma lista de arquivos. Se `retryIds` for informado, reutiliza os ids
  // da barra de progresso (preservando a ordem original), em vez de criar novos.
  const processMediaFiles = async (
    files: File[],
    type: 'image' | 'video' | 'document',
    retryIds?: string[],
  ) => {
    if (!files || files.length === 0) return;

    // ---- Validação prévia (formato + tamanho) — mostra aviso claro ----
    const validFiles: File[] = [];
    const validIds: (string | undefined)[] = [];
    const rejected: { name: string; reason: string }[] = [];
    files.forEach((file, i) => {
      const res = validateFileForType(file, type);
      if (res.ok) {
        validFiles.push(file);
        validIds.push(retryIds?.[i]);
      } else {
        rejected.push({ name: file.name, reason: res.reason });
      }
    });
    if (rejected.length > 0) {
      rejected.forEach((r) => toast.error(`"${r.name}" não pode ser enviado`, { description: r.reason }));
    }
    if (validFiles.length === 0) return;

    try {
      setSaving(true);
      const newMedia: any[] = [];
      const newDocs: any[] = [];

      // ---- Cobrança de excedentes (apenas em envios novos, não em retry) ----
      if (!retryIds && (type === 'image' || type === 'video')) {
        const FREE_PHOTOS = 6;
        const FREE_VIDEOS = 1;
        const existing = (profile?.portfolio_media || []).filter((f: any) => f.type === type).length;
        const incoming = validFiles.length;
        const freeLeft = Math.max(0, (type === 'image' ? FREE_PHOTOS : FREE_VIDEOS) - existing);
        const extras = Math.max(0, incoming - freeLeft);
        if (extras > 0 && profile?.id) {
          const { getActionCost, spendCoinsForAction } = await import('@/lib/monetization');
          const key = type === 'image' ? 'extra_photo' : 'extra_video';
          const per = getActionCost(key)?.coins ?? (type === 'image' ? 5 : 10);
          const total = extras * per;
          const label = type === 'image' ? 'foto(s)' : 'vídeo(s)';
          const ok = per > 0 ? window.confirm(
            `Você está enviando ${extras} ${label} além da cota grátis (${type === 'image' ? FREE_PHOTOS : FREE_VIDEOS}).\n\nCusto estimado: ${total} moedas (${per}/${type === 'image' ? 'foto' : 'vídeo'}).\n\nConfirmar upload?`
          ) : true;
          if (!ok) { setSaving(false); return; }
          let charged = 0;
          for (let i = 0; i < extras; i++) {
            const res = await spendCoinsForAction(profile.id, key, `portfolio_${type}`);
            if (!res.ok) {
              if (res.reason === 'insufficient') { toast.error(`Saldo insuficiente. Necessário: ${res.cost} moedas por ${type === 'image' ? 'foto' : 'vídeo'}.`); setSaving(false); return; }
              if (res.reason === 'disabled') break;
              toast.error('Falha ao debitar moedas', { description: res.error }); setSaving(false); return;
            }
            charged += res.cost ?? per;
          }
          if (charged > 0) toast.success(`−${charged} moedas · ${extras} ${label} extra(s) liberadas.`);
        }
      }

      for (let i = 0; i < validFiles.length; i++) {
        const file = validFiles[i];
        const existingId = validIds[i];
        const uploadId = existingId || `${Date.now()}-${i}-${Math.random().toString(36).slice(2, 8)}`;

        if (existingId) {
          // Retry: reseta o item para 'uploading' preservando posição/ordem
          setUploads((prev) => prev.map((u) => u.id === existingId ? { ...u, status: 'uploading', error: undefined } : u));
        } else {
          setUploads((prev) => [...prev, { id: uploadId, name: file.name, type, status: 'uploading', file }]);
        }

        try {
          let processedFile = file;
          if (type === 'image') {
            try {
              processedFile = await compressImage(file);
            } catch (err) {
              console.error("Erro na compressão:", err);
            }
          }

          let item: any;

          if (type === 'document') {
            // Documentos → bucket PRIVADO (documents-private). Persistimos `path`,
            // não URL pública. A URL de leitura é gerada sob demanda via signedUrl.
            const uploaded = await (async () => {
              try {
                return await uploadProfileDocument(processedFile, profile.id);
              } catch (err) {
                // 1 retry
                return await uploadProfileDocument(processedFile, profile.id);
              }
            })();
            item = uploaded;
          } else {
            const fileExt = file.name.split('.').pop();
            const fileName = `${profile.id}-${type}-${Date.now()}-${i}.${fileExt}`;
            const filePath = `${type}s/${fileName}`;

            const uploadWithRetry = async (retries = 2): Promise<any> => {
              try {
                const { error: uploadError } = await supabaseExternal.storage
                  .from('media')
                  .upload(filePath, processedFile);
                if (uploadError) throw uploadError;
                return true;
              } catch (err) {
                if (retries > 0) return uploadWithRetry(retries - 1);
                throw err;
              }
            };

            await uploadWithRetry();

            const { data: { publicUrl } } = supabaseExternal.storage
              .from('media')
              .getPublicUrl(filePath);

            item = {
              name: file.name,
              url: publicUrl,
              type,
              size: `${(file.size / (1024 * 1024)).toFixed(2)} MB`,
              created_at: new Date().toISOString(),
            };
          }

          if (type === 'document') newDocs.push(item);
          else newMedia.push(item);


          setUploads((prev) => prev.map((u) => u.id === uploadId ? { ...u, status: 'success' } : u));
        } catch (err: any) {
          console.error('[upload] falha em', file.name, err);
          const message = err?.message || 'Falha no upload';
          setUploads((prev) => prev.map((u) => u.id === uploadId ? { ...u, status: 'error', error: message, file } : u));
          toast.error(`Falha ao enviar "${file.name}"`, { description: message });
        }
      }

      if (newMedia.length === 0 && newDocs.length === 0) return;

      const updatedPortfolio = [...(profile.portfolio_media || []), ...newMedia];
      const updatedDocs = [...(profile.documents || []), ...newDocs];
      await persistMedia(updatedPortfolio, updatedDocs);
      toast.success(`${newMedia.length + newDocs.length} arquivo(s) salvos com sucesso!`);

      setTimeout(() => {
        setUploads((prev) => prev.filter((u) => u.status !== 'success'));
      }, 3000);
    } catch (error: any) {
      toast.error("Erro ao salvar arquivos: " + (error?.message || 'falha desconhecida'));
    } finally {
      setSaving(false);
    }
  };

  const handleMediaUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
    type: 'image' | 'video' | 'document',
  ) => {
    const files = e.target.files ? Array.from(e.target.files) : [];
    try {
      await processMediaFiles(files, type);
    } finally {
      try { (e.target as HTMLInputElement).value = ''; } catch {}
    }
  };

  // Reenvia todos os uploads que falharam, preservando a ordem original.
  const retryFailedUploads = async () => {
    const failed = uploads.filter((u) => u.status === 'error' && u.file);
    if (failed.length === 0) {
      toast.info('Nenhum upload falho para reenviar.');
      return;
    }
    // Agrupa por tipo mantendo a ordem original (uploads state já é ordenado por inserção).
    const byType: Record<'image'|'video'|'document', { files: File[]; ids: string[] }> = {
      image: { files: [], ids: [] },
      video: { files: [], ids: [] },
      document: { files: [], ids: [] },
    };
    failed.forEach((u) => {
      byType[u.type].files.push(u.file as File);
      byType[u.type].ids.push(u.id);
    });
    toast.info(`Reenviando ${failed.length} arquivo(s) que falharam…`);
    for (const t of ['image', 'video', 'document'] as const) {
      if (byType[t].files.length > 0) {
        await processMediaFiles(byType[t].files, t, byType[t].ids);
      }
    }
  };

  // Reordena via teclado (setas): move o item da posição atual em ±1.
  const handleReorderKeyDown = (
    e: React.KeyboardEvent,
    list: 'doc' | 'image' | 'video',
    index: number,
    total: number,
  ) => {
    let target = -1;
    if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') target = Math.max(0, index - 1);
    else if (e.key === 'ArrowRight' || e.key === 'ArrowDown') target = Math.min(total - 1, index + 1);
    else if (e.key === 'Home') target = 0;
    else if (e.key === 'End') target = total - 1;
    else return;
    e.preventDefault();
    if (target !== index) reorderMedia(list, index, target);
  };



  // Persiste portfolio_media / documents com fallback para custom_sections.__extras
  const persistMedia = async (portfolio: any[], docs: any[]) => {
    if (!profile?.id) return;
    const basePayload: any = {
      portfolio_media: portfolio,
      documents: docs,
      custom_sections: profile.custom_sections ?? {},
    };
    const extras: Record<string, unknown> = { ...((basePayload.custom_sections as any)?.__extras || {}) };
    let lastError: any = null;
    let attempts = 0;
    while (attempts < 6) {
      attempts++;
      const { error } = await supabaseExternal.from('profiles').update(basePayload).eq('id', profile.id);
      if (!error) { lastError = null; break; }
      lastError = error;
      const msg = error.message || '';
      const m =
        msg.match(/'([^']+)'\s+column/i) ||
        msg.match(/column\s+"([^"]+)"/i) ||
        msg.match(/Could not find the '([^']+)'/i);
      const col = m?.[1];
      if (col && col in basePayload && col !== 'custom_sections' && col !== 'id') {
        console.warn(`[persistMedia] Coluna inexistente "${col}" — movendo para custom_sections.__extras`);
        extras[col] = basePayload[col];
        delete basePayload[col];
        basePayload.custom_sections = { ...(basePayload.custom_sections || {}), __extras: extras };
        continue;
      }
      break;
    }
    if (lastError) throw lastError;
    setProfile((prev: any) => ({
      ...prev,
      portfolio_media: portfolio,
      documents: docs,
      custom_sections: basePayload.custom_sections ?? prev?.custom_sections,
    }));
  };

  // Remove um item (documento/imagem/vídeo) e persiste automaticamente.
  const removeMediaItem = async (list: 'doc'|'image'|'video', index: number) => {
    try {
      const currentDocs = [...(profile?.documents || [])];
      const currentMedia = [...(profile?.portfolio_media || [])];
      if (list === 'doc') {
        const docItems = currentDocs.filter((f: any) => f.type === 'document');
        const target = docItems[index];
        if (!target) return;
        const nextDocs = currentDocs.filter((d: any) => d !== target);
        await persistMedia(currentMedia, nextDocs);
        // best-effort: apaga do bucket privado se for do novo formato
        try { await deleteProfileDocument(target); } catch { /* ignore */ }
      } else {
        const kind = list;
        const items = currentMedia.filter((f: any) => f.type === kind);
        const target = items[index];
        if (!target) return;
        const nextMedia = currentMedia.filter((d: any) => d !== target);
        await persistMedia(nextMedia, currentDocs);
      }
      toast.success('Item removido');
    } catch (err: any) {
      toast.error('Falha ao remover', { description: err?.message });
    }
  };

  // Reordena preservando a ordem global de portfolio_media / documents.
  const reorderMedia = async (list: 'doc'|'image'|'video', fromIdx: number, toIdx: number) => {
    if (fromIdx === toIdx) return;
    try {
      if (list === 'doc') {
        const currentDocs = [...(profile?.documents || [])];
        const docItems = currentDocs.filter((f: any) => f.type === 'document');
        const others = currentDocs.filter((f: any) => f.type !== 'document');
        const [moved] = docItems.splice(fromIdx, 1);
        docItems.splice(toIdx, 0, moved);
        await persistMedia(profile?.portfolio_media || [], [...others, ...docItems]);
      } else {
        const kind = list;
        const currentMedia = [...(profile?.portfolio_media || [])];
        const items = currentMedia.filter((f: any) => f.type === kind);
        const others = currentMedia.filter((f: any) => f.type !== kind);
        const [moved] = items.splice(fromIdx, 1);
        items.splice(toIdx, 0, moved);
        await persistMedia([...others, ...items], profile?.documents || []);
      }
    } catch (err: any) {
      toast.error('Falha ao reordenar', { description: err?.message });
    }
  };





  const handleAddNewBrand = async () => {
    if (!newBrand.trim()) return;
    const { error } = await supabaseExternal.from('brand_flags').insert({ name: newBrand.trim() });
    if (error) {
      toast.error("Erro ao adicionar bandeira");
    } else {
      setBrands([...brands, newBrand.trim()].sort());
      setProfile({ ...profile, brand_flag: newBrand.trim() });
      setNewBrand("");
      setIsAddingBrand(false);
      toast.success("Nova bandeira adicionada!");
    }
  };

  const bioLen = (profile?.about_bio || '').length;
  const bioOverLimit = bioLen > BIO_MAX_LENGTH;
  const radiusInvalid =
    profile?.default_radius != null && !isAllowedRadius(profile.default_radius);
  // 🎯 Foco automático em um campo específico via ?focus=<data-profile-field>
  // Usado pelo card amarelo do painel do lojista para levar o usuário
  // direto ao campo que ainda falta preencher. Se a chave for inválida
  // ou o campo não existir (após retry), avisamos discretamente por toast
  // para o usuário não ficar sem feedback.
  useEffect(() => {
    if (!focusField || loading || !profile?.id) return;
    let cancelled = false;
    (async () => {
      // Pequeno atraso para deixar o layout hidratar antes do primeiro try.
      await new Promise((r) => setTimeout(r, 250));
      if (cancelled) return;
      const { focusProfileFieldWithRetry } = await import("@/lib/profile-focus");
      const result = await focusProfileFieldWithRetry(focusField, { tries: 15, delayMs: 200 });
      if (cancelled) return;
      if (!result.ok) {
        console.warn(`[profile] focus=${focusField} não encontrado (${result.reason}).`);
        toast.info("Complete os campos destacados abaixo.", { duration: 2500 });
      }
    })();
    return () => { cancelled = true; };
  }, [focusField, loading, profile?.id]);

  const canSave = !saving && !bioOverLimit && !radiusInvalid;

  const handleSave = async (opts?: { silent?: boolean }) => {
    const silent = !!opts?.silent;
    if (!profile?.id) {
      if (!silent) toast.error("Perfil não carregado.", { description: "Recarregue a página e tente novamente." });
      return;
    }
    if (bioOverLimit) {
      if (!silent) toast.error(`O campo "Sobre" excede o limite (${bioLen}/${BIO_MAX_LENGTH}).`);
      return;
    }
    if (radiusInvalid) {
      if (!silent) toast.error("Raio de atuação inválido.");
      return;
    }
    // 💼 Validação: prestador deve escolher ao menos um formato em "Aceita trabalhos como"
    // (bloqueia apenas o save manual — o autosave não interrompe o fluxo de edição).
    if (!silent && profile?.role === 'prestador') {
      const wm = Array.isArray(profile?.work_modes) ? profile.work_modes.filter(Boolean) : [];
      if (wm.length === 0) {
        toast.error('Escolha ao menos um formato em "💼 Aceita trabalhos como".', {
          description: 'Selecione entre Contratos FreeLancer MEI, Contratos Fixos MEI, Contratação CLT ou Serviços Individuais.',
        });
        return;
      }
    }

    if (silent) setAutoSaving(true); else setSaving(true);
    try {
      // Payload mutável; se uma coluna não existir no schema, movemos o
      // valor para custom_sections.__extras (JSONB) para não perder o dado.
      const payload: any = { ...profile };
      const extras: Record<string, unknown> = {
        ...((payload.custom_sections as any)?.__extras || {}),
      };
      // remove chaves internas/derivadas que nunca devem ir para o banco
      delete payload.id_temp;

      let lastError: any = null;
      let attempts = 0;
      while (attempts < 30) {
        attempts++;
        const { error } = await supabaseExternal
          .from('profiles')
          .update(payload)
          .eq('id', profile.id);
        if (!error) { lastError = null; break; }
        lastError = error;
        const msg = error.message || '';
        // Suporta duas variantes de mensagem do PostgREST/Postgres
        const m =
          msg.match(/'([^']+)'\s+column/i) ||
          msg.match(/column\s+"([^"]+)"/i) ||
          msg.match(/Could not find the '([^']+)'/i);
        const col = m?.[1];
        if (col && col in payload && col !== 'custom_sections' && col !== 'id') {
          console.warn(`[profile.save] Coluna inexistente "${col}" — movendo para custom_sections.__extras`);
          extras[col] = payload[col];
          delete payload[col];
          payload.custom_sections = {
            ...(payload.custom_sections || {}),
            __extras: extras,
          };
          continue;
        }
        break;
      }

      if (lastError) {
        if (!profileId && profile?.id) markPending(profile.id, true);
        if (!silent) {
          toast.error("Erro ao salvar perfil", {
            description: lastError.message || "Falha desconhecida ao gravar no banco.",
          });
        } else {
          console.warn('[profile.autosave] falha:', lastError.message);
        }
        return;
      }

      // Refetch para refletir estado real (colunas + __extras reidratado)
      const { data: fresh, error: refetchErr } = await supabaseExternal
        .from('profiles')
        .select('*')
        .eq('id', profile.id)
        .single();

      if (fresh && !refetchErr) {
        let mergedFresh: any = fresh;
        const savedExtras = (fresh?.custom_sections as any)?.__extras;
        if (savedExtras && typeof savedExtras === 'object') {
          mergedFresh = { ...savedExtras, ...fresh };
        }
        mergedFresh = normalizeMasks(mergedFresh);
        setProfile(mergedFresh);
        lastSavedSnapshotRef.current = JSON.stringify(mergedFresh);
        setLastSavedAt(Date.now());
        try {
          window.dispatchEvent(
            new CustomEvent('fixxer:profile-updated', { detail: { id: fresh.id } }),
          );
        } catch { /* noop */ }
      }

      if (profile?.id) clearDraft(profile.id);

      if (!silent) toast.success("Perfil atualizado com sucesso!");
    } catch (e: any) {
      if (!profileId && profile?.id) markPending(profile.id, true);
      if (!silent) {
        toast.error("Erro inesperado ao salvar perfil", {
          description: e?.message || String(e),
        });
      } else {
        console.warn('[profile.autosave] exceção:', e?.message || e);
      }
    } finally {
      if (silent) setAutoSaving(false); else setSaving(false);
    }
  };

  // 💾 SALVAMENTO AUTOMÁTICO (debounced, silencioso) — dispara 1.5s após a
  // última edição, comparando um snapshot JSON para evitar loops.
  useEffect(() => {
    if (loading || profileId || !profile?.id) return;
    if (saving || autoSaving) return;
    const snapshot = JSON.stringify(profile);
    if (snapshot === lastSavedSnapshotRef.current) return;
    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    autoSaveTimerRef.current = setTimeout(() => {
      handleSave({ silent: true });
    }, 1500);
    return () => {
      if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile, loading, profileId]);

  // Persiste rascunho local a cada mudança nos campos "leves"
  useEffect(() => {
    if (loading || profileId) return; // não persiste em modo "visualização de terceiros"
    if (!profile?.id) return;
    saveDraft(
      profile.id,
      {
        about_bio: profile.about_bio ?? null,
        default_radius: profile.default_radius ?? null,
        activity_branch: profile.activity_branch ?? null,
        custom_sections: profile.custom_sections ?? null,
      },
      false,
    );
  }, [
    loading,
    profileId,
    profile?.id,
    profile?.about_bio,
    profile?.default_radius,
    profile?.activity_branch,
    profile?.custom_sections,
  ]);

  // Reenvia rascunho pendente automaticamente quando a conexão volta
  useEffect(() => {
    if (profileId) return;
    const onOnline = () => {
      if (!profile?.id) return;
      const draft = loadDraft(profile.id);
      if (draft?.pending && !saving) {
        toast.info("Conexão restabelecida — reenviando seu rascunho...");
        handleSave();
      }
    };
    window.addEventListener("online", onOnline);
    return () => window.removeEventListener("online", onOnline);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profileId, profile?.id, saving]);



  const handleCepLookup = async (cep: string) => {
    const cleanCep = cep.replace(/\D/g, '');
    if (cleanCep.length !== 8) return;
    // Mantém o CEP mascarado no formato 00000-000 (não sobrescreve com dígitos puros)
    const maskedCep = `${cleanCep.slice(0, 5)}-${cleanCep.slice(5)}`;

    try {
      const response = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
      const data = await response.json();
      if (!data.erro) {
        setProfile((prev: any) => ({
          ...prev,
          cep: maskedCep,
          street: data.logradouro || prev?.street || '',
          neighborhood: data.bairro || prev?.neighborhood || '',
          city: data.localidade || prev?.city || '',
          state: data.uf || prev?.state || '',
        }));
        toast.success("Endereço preenchido via CEP!");
      }
    } catch (e) {
      console.error("Erro CEP:", e);
    }
  };

  // ⚠️ Hooks SEMPRE antes de qualquer early return, para manter a ordem estável
  // entre renders (evita "Rendered more hooks than during the previous render").
  const theme = useMemo(() => getCategoryTheme(roleToCategory(profile?.role)), [profile?.role]);

  if (loading) return (
    <div className="flex flex-col items-center justify-center h-[80vh] gap-4 bg-[#121214]">
      <Loader2 className="animate-spin text-primary w-12 h-12" />
      <p className="text-muted-foreground font-black uppercase tracking-widest text-[10px] animate-pulse">Sincronizando Perfil...</p>
    </div>
  );


  return (
    <div
      className="min-h-screen bg-[#121214] pb-20 overflow-x-hidden"
      style={{
        // Sobrescreve tokens Tailwind (primary) para pintar toda a página com a cor da categoria
        ["--primary" as any]: theme.hex,
        ["--primary-foreground" as any]: "#0A0A0B",
        ["--sidebar-primary" as any]: theme.hex,
        ["--sidebar-primary-foreground" as any]: "#0A0A0B",
        ["--ring" as any]: theme.hex,
      }}
    >
      {/* Pílula flutuante de autosave — reflete estado de qualquer campo do perfil */}
      {!profileId && (
        <AutosaveStatusPill
          saving={saving}
          autoSaving={autoSaving}
          lastSavedAt={lastSavedAt}
          isDirty={
            !!profile?.id &&
            JSON.stringify(profile) !== lastSavedSnapshotRef.current
          }
        />
      )}

      {/* 1. CABEÇALHO DO PERFIL */}
      <div className="relative h-64 w-full group">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-[#121214]/80 z-10 pointer-events-none" />
        {profile?.banner_url ? (
          <img src={profile.banner_url} className="w-full h-full object-cover" alt="Banner" />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-white/[0.04] to-white/[0.02] border-b border-white/10 flex flex-col items-center justify-center gap-2 text-white/50">
            <Camera className="w-8 h-8" />
            <span className="text-xs font-black uppercase tracking-widest">Adicione seu banner</span>
          </div>
        )}
        {/* Botão movido para o topo direito para não ser coberto pelo card do avatar */}
        <label className="absolute right-4 top-4 z-40 cursor-pointer bg-black/70 hover:bg-primary hover:text-black px-4 py-2.5 rounded-xl backdrop-blur-md border border-white/10 transition-all active:scale-95 inline-flex items-center gap-2 text-xs font-black uppercase tracking-widest shadow-lg">
          <Camera className="w-4 h-4" />
          {profile?.banner_url ? 'Trocar Banner' : 'Enviar Banner'}
          <input type="file" className="hidden" accept="image/*" onChange={(e) => handleFileUpload(e, 'banner')} />
        </label>

      </div>

      <div className="max-w-5xl mx-auto px-6 -mt-20 relative z-30">
        <div className="flex flex-col md:flex-row items-end gap-6 mb-12">
          <div className="relative group">
            <div
              className="w-40 h-40 rounded-3xl overflow-hidden border-4 bg-[#121214] shadow-2xl"
              style={{ borderColor: theme.hex, boxShadow: `0 0 30px rgba(${theme.rgb}, 0.45)` }}
            >
              {profile?.avatar_url ? (
                <img src={profile.avatar_url} className="w-full h-full object-cover" alt="Avatar" />
              ) : (
                <div className="w-full h-full bg-white/5 flex items-center justify-center text-4xl font-black">{(profile?.display_name || profile?.full_name || '?').charAt(0)}</div>
              )}
            </div>
            <label className="absolute bottom-2 right-2 cursor-pointer bg-primary text-black p-2 rounded-lg shadow-lg hover:scale-110 transition-all">
              <Camera className="w-4 h-4" />
              <input type="file" className="hidden" accept="image/*" onChange={(e) => handleFileUpload(e, 'avatar')} />
            </label>
          </div>

          <div className="flex-1 pb-4">
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-4xl font-black text-white tracking-tighter">{profile?.display_name || profile?.full_name || 'Usuário'}</h1>
              <div className="flex items-center gap-1 bg-primary/10 px-3 py-1 rounded-full border border-primary/20">
                <Star className="w-4 h-4 text-primary fill-primary" />
                <span className="text-primary font-black text-sm">{profile?.karma_score || '5.0'}</span>
              </div>
            </div>
            <div className="flex flex-wrap gap-2 items-center">
              <span
                className="text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-md flex items-center gap-1 border"
                style={{ ...theme.bgSoft, ...theme.borderSoft, color: theme.hex }}
              >
                <BadgeCheck className="w-3 h-3" />
                {theme.label}
              </span>
              {(() => {
                const primaryRole = parseCsvList(profile?.job_roles)[0];
                if (!primaryRole) return null;
                return (
                  <span
                    className="text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-md flex items-center gap-1 border bg-white/[0.04]"
                    style={{ borderColor: `${theme.hex}55`, color: theme.hex }}
                    title="Cargo principal"
                  >
                    <Star className="w-3 h-3 fill-current" />
                    {primaryRole}
                  </span>
                );
              })()}
              {!profileId && (
                <>
                  <CoinBalanceBadge />
                  <PlanBadge planId={profile?.plan_id || "free"} renewsAt={profile?.plan_renews_at} />
                </>
              )}
            </div>
          </div>



          {profileId ? (
            <div className="flex flex-col gap-2 mb-4">
              <button 
                className="bg-[#00FF87] text-black font-black px-8 py-4 rounded-2xl shadow-[0_0_20px_rgba(0,255,135,0.3)] flex items-center gap-2 uppercase tracking-tighter"
              >
                <MessageSquare className="w-5 h-5" />
                Chat com {profile?.full_name?.split(' ')[0]}
              </button>
              {targetPost && (
                <div className="p-3 bg-white/5 border border-white/10 rounded-xl">
                  <p className="text-[8px] font-black text-muted-foreground uppercase mb-1">Contexto do Anúncio</p>
                  <p className="text-[10px] font-bold text-white truncate">{targetPost.title}</p>
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-end gap-2 mb-4">
              {(() => {
                const planQuota = quotaForPlan(profile?.plan_id);
                const offeringsList = Array.isArray(profile?.offerings)
                  ? profile.offerings
                  : parseCsvList(profile?.offerings);
                const rolesList = parseCsvList(profile?.job_roles);
                const offExtra = Math.max(0, offeringsList.length - planQuota);
                const rolExtra = Math.max(0, rolesList.length - planQuota);
                const totalExtra = offExtra + rolExtra;
                if (totalExtra === 0) return null;
                return (
                  <div className="text-right text-[10px] font-bold bg-amber-500/10 border border-amber-500/30 text-amber-300 rounded-xl px-3 py-2 max-w-[280px]">
                    Resumo de itens extras (além da cota do plano {String(profile?.plan_id || 'free').toUpperCase()} = {planQuota}):
                    <ul className="mt-1 space-y-0.5 text-amber-200/90">
                      {offExtra > 0 && <li>• {offExtra} oferta(s) extra · {offExtra * EXTRA_ITEM_COST} 🪙</li>}
                      {rolExtra > 0 && <li>• {rolExtra} cargo(s) extra · {rolExtra * EXTRA_ITEM_COST} 🪙</li>}
                    </ul>
                    <div className="mt-1 pt-1 border-t border-amber-500/30 font-black">
                      Total já debitado: {totalExtra * EXTRA_ITEM_COST} 🪙
                    </div>
                  </div>
                );
              })()}
              <button
                onClick={() => handleSave()}
                disabled={!canSave}
                title={
                  bioOverLimit
                    ? `Reduza o texto de "Sobre" (${bioLen}/${BIO_MAX_LENGTH}).`
                    : radiusInvalid
                      ? `Raio inválido. Use ${ALLOWED_RADII_KM.join(", ")} km.`
                      : undefined
                }
                className="bg-primary text-black font-black px-8 py-4 rounded-2xl shadow-[0_0_20px_rgba(0,255,135,0.3)] hover:shadow-[0_0_30px_rgba(0,255,135,0.5)] transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 uppercase tracking-tighter"
              >
                {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                {saving ? 'Salvando...' : 'Salvar Perfil'}
              </button>
              <span className="text-[10px] font-black uppercase tracking-widest text-white/50 flex items-center gap-1.5 h-4">
                {autoSaving ? (<><Loader2 className="w-3 h-3 animate-spin" /> Salvando automaticamente...</>) : (<>💾 Autosave ativo</>)}
              </span>
            </div>
          )}

        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            {/* FORMULÁRIO DINÂMICO */}
            <section className="bg-card/30 backdrop-blur-xl border border-white/10 p-8 rounded-[2.5rem] shadow-2xl space-y-8">
              <div className="flex items-center gap-3 border-b border-white/5 pb-4">
                <User className="w-6 h-6 text-primary" />
                <h3 className="text-xl font-black uppercase tracking-tighter">Dados Fundamentais</h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2 md:col-span-2">
                  <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1">Nome de Exibição</label>
                  <input
                    value={profile?.display_name || ''}
                    onChange={e => setProfile({...profile, display_name: e.target.value})}
                    readOnly={!!profileId}
                    placeholder="Como quer ser visto no FIXXER (ex.: Marcenaria do Jorge)"
                    className="w-full bg-white/5 border border-white/10 focus:border-primary/50 focus:ring-1 focus:ring-primary/20 p-4 rounded-2xl transition-all outline-none disabled:opacity-50"
                  />
                  <p className="text-[10px] text-white/40 ml-1">Aparece nos cards, feeds e no perfil público.</p>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1">Razão Social</label>
                  <input 
                    value={profile?.company_name || ''} 
                    onChange={e => setProfile({...profile, company_name: e.target.value})}
                    readOnly={!!profileId}
                    className="w-full bg-white/5 border border-white/10 focus:border-primary/50 focus:ring-1 focus:ring-primary/20 p-4 rounded-2xl transition-all outline-none disabled:opacity-50"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1">CNPJ / CPF</label>
                  <MaskedInput 
                    mask="cnpj"
                    value={profile?.cnpj_cpf || ''} 
                    onChange={(val: string) => setProfile({...profile, cnpj_cpf: val})}
                    className="w-full bg-white/5 border border-white/10 focus:border-primary/50 focus:ring-1 focus:ring-primary/20 p-4 rounded-2xl transition-all outline-none font-mono"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1">WhatsApp</label>
                  <MaskedInput 
                    mask="whatsapp"

                    value={profile?.whatsapp || ''} 
                    onChange={(val: string) => setProfile({...profile, whatsapp: val})}
                    className="w-full bg-white/5 border border-white/10 focus:border-primary/50 focus:ring-1 focus:ring-primary/20 p-4 rounded-2xl transition-all outline-none font-mono"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1">Telefone</label>
                  <MaskedInput 
                    mask="phone"
                    value={profile?.phone || ''} 
                    onChange={(val: string) => setProfile({...profile, phone: val})}
                    className="w-full bg-white/5 border border-white/10 focus:border-primary/50 focus:ring-1 focus:ring-primary/20 p-4 rounded-2xl transition-all outline-none font-mono"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1">Email de Contato</label>
                  <input 
                    type="email"
                    value={profile?.contact_email || ''} 
                    onChange={e => setProfile({...profile, contact_email: e.target.value})}
                    className="w-full bg-white/5 border border-white/10 focus:border-primary/50 focus:ring-1 focus:ring-primary/20 p-4 rounded-2xl transition-all outline-none"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1">Responsável</label>
                  <input 
                    value={profile?.responsible_name || ''} 
                    onChange={e => setProfile({...profile, responsible_name: e.target.value})}
                    className="w-full bg-white/5 border border-white/10 focus:border-primary/50 focus:ring-1 focus:ring-primary/20 p-4 rounded-2xl transition-all outline-none"
                  />
                </div>

                {/* 💸 CHAVE PIX — recebimento de pagamentos.
                    Tipos oficiais do BCB: CPF, CNPJ, E-mail, Telefone e Aleatória (EVP).
                    Não existe tipo "Automático" no PIX — o antigo rótulo foi removido.
                    Persistida em coluna própria (se existir) ou em custom_sections.__extras
                    via o mecanismo de fallback do autosave. */}
                {(() => {
                  const pixKey = (profile?.pix_key || '').trim();
                  const rawType = profile?.pix_key_type;
                  const detected = pixKey ? detectPixKeyType(pixKey) : null;
                  // Migra silenciosamente o antigo valor "auto" para o tipo detectado.
                  const effectiveType: PixKeyType | '' =
                    (rawType && rawType !== 'auto' ? rawType : detected) || '';
                  const validationError = pixKey && effectiveType
                    ? validatePixKey(effectiveType as PixKeyType, pixKey)
                    : null;
                  return (
                    <div className="md:col-span-2 space-y-2">
                      <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1 flex items-center gap-2 flex-wrap">
                        💸 Chave PIX <span className="text-[9px] font-bold text-primary/80 normal-case tracking-normal">— para receber pagamentos</span>
                      </label>
                      <div className="flex flex-col sm:flex-row gap-2">
                        <select
                          value={effectiveType || ''}
                          onChange={e => setProfile({ ...profile, pix_key_type: e.target.value })}
                          className="sm:w-52 bg-white/5 border border-white/10 focus:border-primary/50 focus:ring-1 focus:ring-primary/20 p-4 rounded-2xl outline-none text-xs font-bold uppercase"
                          aria-label="Tipo da chave PIX"
                        >
                          <option value="">Selecione o tipo…</option>
                          <option value="cpf">CPF</option>
                          <option value="cnpj">CNPJ</option>
                          <option value="email">E-mail</option>
                          <option value="phone">Telefone</option>
                          <option value="random">Aleatória (EVP)</option>
                        </select>
                        <input
                          type="text"
                          value={profile?.pix_key || ''}
                          onChange={e => {
                            const value = e.target.value;
                            const next: any = { ...profile, pix_key: value };
                            // Autodetecta o tipo enquanto o usuário digita, se ainda não tiver sido escolhido.
                            if (!rawType || rawType === 'auto') {
                              const t = detectPixKeyType(value);
                              if (t) next.pix_key_type = t;
                            }
                            setProfile(next);
                          }}
                          placeholder="Cole aqui sua chave PIX (CPF, CNPJ, e-mail, telefone ou aleatória)"
                          className="flex-1 min-w-0 bg-white/5 border border-white/10 focus:border-primary/50 focus:ring-1 focus:ring-primary/20 p-4 rounded-2xl transition-all outline-none font-mono"
                          autoComplete="off"
                          spellCheck={false}
                          inputMode="text"
                          aria-invalid={!!validationError}
                          aria-describedby="pix-help"
                        />
                      </div>
                      {validationError ? (
                        <p role="alert" className="text-[10px] font-bold text-rose-400 ml-1">
                          ⚠ {validationError}
                        </p>
                      ) : effectiveType && pixKey ? (
                        <p className="text-[10px] font-bold text-emerald-400 ml-1">
                          ✓ Chave {PIX_KEY_TYPE_LABELS[effectiveType as PixKeyType]} válida — será salva automaticamente.
                        </p>
                      ) : null}
                      <p id="pix-help" className="text-[10px] text-muted-foreground ml-1">
                        Tipos oficiais: CPF, CNPJ, E-mail, Telefone ou Aleatória (EVP).
                        Sua chave aparece <b>parcialmente mascarada</b> no perfil público, com botão de copiar seguro.
                      </p>
                    </div>
                  );
                })()}
              </div>


              {/* ENDEREÇO ESTRUTURADO */}
              <div className="pt-8 space-y-6">
                <div className="flex items-center gap-3 border-b border-white/5 pb-4">
                  <MapPin className="w-6 h-6 text-primary" />
                  <h3 className="text-xl font-black uppercase tracking-tighter">Localização Técnica</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="md:col-span-1 space-y-2">
                    <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1">CEP</label>
                    <MaskedInput
                      mask="cep"
                      value={profile?.cep || ''}
                      onChange={(val: string) => {
                        setProfile({ ...profile, cep: val });
                        if (val.replace(/\D/g, '').length === 8) handleCepLookup(val);
                      }}
                      placeholder="00000-000"
                      className="w-full bg-white/5 border border-white/10 focus:border-primary/50 focus:ring-1 focus:ring-primary/20 p-4 rounded-2xl transition-all outline-none font-mono"
                    />
                  </div>
                  <div className="md:col-span-2 space-y-2">
                    <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1">Logradouro</label>
                    <input 
                      value={profile?.street || ''} 
                      onChange={e => setProfile({...profile, street: e.target.value})}
                      className="w-full bg-white/5 border border-white/10 focus:border-primary/50 focus:ring-1 focus:ring-primary/20 p-4 rounded-2xl transition-all outline-none"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1">Bairro</label>
                    <input 
                      value={profile?.neighborhood || ''} 
                      onChange={e => setProfile({...profile, neighborhood: e.target.value})}
                      className="w-full bg-white/5 border border-white/10 focus:border-primary/50 focus:ring-1 focus:ring-primary/20 p-4 rounded-2xl transition-all outline-none"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1">Cidade</label>
                    <input 
                      value={profile?.city || ''} 
                      onChange={e => setProfile({...profile, city: e.target.value})}
                      className="w-full bg-white/5 border border-white/10 focus:border-primary/50 focus:ring-1 focus:ring-primary/20 p-4 rounded-2xl transition-all outline-none"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1">Estado (UF)</label>
                    <input 
                      value={profile?.state || ''} 
                      onChange={e => setProfile({...profile, state: e.target.value})}
                      className="w-full bg-white/5 border border-white/10 focus:border-primary/50 focus:ring-1 focus:ring-primary/20 p-4 rounded-2xl transition-all outline-none font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* RAIO DE ATUAÇÃO */}
              <div className="pt-8 space-y-6">
                <div className="flex items-center gap-3 border-b border-white/5 pb-4">
                  <MapPin className="w-6 h-6 text-primary" />
                  <h3 className="text-xl font-black uppercase tracking-tighter">Raio de Atuação</h3>
                </div>
                <p className="text-[11px] text-muted-foreground -mt-2">
                  Distância máxima (a partir do seu endereço atual) usada como padrão nos feeds e recomendações da sua categoria.
                </p>
                <div className="flex flex-wrap gap-2">
                  {[
                    { value: 10, label: "10 km" },
                    { value: 25, label: "25 km" },
                    { value: 50, label: "50 km" },
                    { value: 100, label: "100 km" },
                    { value: 0, label: "Toda a Região" },
                  ].map((opt) => {
                    const current = Number(profile?.service_radius_km ?? 25);
                    const active = current === opt.value;
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => {
                          setProfile({
                            ...profile,
                            service_radius_km: opt.value,
                            default_radius: opt.value,
                          });
                          try {
                            const cat = roleToCategory(profile?.role);
                            localStorage.setItem(`fixxer_radius_${cat}`, String(opt.value));
                            window.dispatchEvent(
                              new CustomEvent("fixxer:radius-change", {
                                detail: { category: cat, radius: opt.value },
                              }),
                            );
                          } catch {
                            /* noop */
                          }
                        }}
                        disabled={!!profileId}
                        className="flex items-center gap-1 rounded-full border px-4 py-2 text-[11px] font-black uppercase tracking-wide transition-all disabled:opacity-50"
                        style={
                          active
                            ? {
                                backgroundColor: theme.hex,
                                color: "#0A0A0B",
                                borderColor: theme.hex,
                                boxShadow: `0 0 12px rgba(${theme.rgb}, 0.45)`,
                              }
                            : {
                                backgroundColor: "rgba(255,255,255,0.05)",
                                color: "rgba(255,255,255,0.7)",
                                borderColor: "rgba(255,255,255,0.1)",
                              }
                        }
                        aria-pressed={active}
                      >
                        <MapPin className="w-3 h-3" aria-hidden />
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
                {radiusInvalid && (
                  <div
                    role="alert"
                    className="rounded-2xl border border-red-500/40 bg-red-500/10 p-3 text-[11px] text-red-200 break-words"
                  >
                    ⚠️ Raio "{profile?.default_radius}" não é permitido. Escolha um dos valores: {ALLOWED_RADII_KM.join(", ")} km.
                  </div>
                )}
              </div>

              {/* SOBRE / APRESENTAÇÃO DA EMPRESA */}
              <div className="pt-8 space-y-4">
                <div className="flex items-center gap-3 border-b border-white/5 pb-4">
                  <FileText className="w-6 h-6 text-primary" />
                  <div className="min-w-0">
                    <h3 className="text-xl font-black uppercase tracking-tighter">Sobre / Apresentação da Empresa</h3>
                    <p className="text-[11px] text-white/50 mt-1 break-words">
                      Este texto aparece na aba <b>Sobre</b> do seu perfil público.
                    </p>
                  </div>
                </div>
                <textarea
                  rows={4}
                  value={profile?.about_bio || ''}
                  onChange={(e) => setProfile({ ...profile, about_bio: e.target.value })}
                  readOnly={!!profileId}
                  placeholder="Conte em poucas palavras sobre sua experiência, especialidades, história e diferenciais de atendimento..."
                  aria-invalid={bioOverLimit}
                  className={`w-full bg-white/5 border ${bioOverLimit ? 'border-red-500/60 focus:border-red-500' : 'border-white/10 focus:border-primary/50'} focus:ring-1 ${bioOverLimit ? 'focus:ring-red-500/30' : 'focus:ring-primary/20'} p-4 rounded-2xl transition-all outline-none text-sm leading-relaxed resize-none`}
                />
                <div className="flex items-center justify-between gap-3 text-[10px] font-black uppercase tracking-widest">
                  <span className={bioOverLimit ? 'text-red-400' : 'text-white/40'}>
                    {bioOverLimit ? `Excedeu ${bioLen - BIO_MAX_LENGTH} caractere(s)` : ''}
                  </span>
                  <span className={bioOverLimit ? 'text-red-400' : bioLen > BIO_MAX_LENGTH * 0.9 ? 'text-amber-400' : 'text-white/40'}>
                    {bioLen}/{BIO_MAX_LENGTH}
                  </span>
                </div>
              </div>


              {/* NOTIFICAÇÕES PUSH */}
              <div className="pt-8 space-y-4">
                <div className="flex items-center gap-3 border-b border-white/5 pb-4">
                  <h3 className="text-xl font-black uppercase tracking-tighter">Notificações & Ganhos</h3>
                </div>
                <PushToggle />
                <Link
                  to="/preferencias/notificacoes"
                  className="w-full flex items-center justify-between gap-3 p-4 rounded-2xl border border-white/10 bg-white/5 hover:border-primary/50 transition-all"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-[#00FF87]/10 flex items-center justify-center text-lg">🔔</div>
                    <div className="text-left">
                      <div className="text-sm font-black text-white uppercase tracking-tight">Preferências de notificação</div>
                      <div className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">Escolha o que receber por push e in-app</div>
                    </div>
                  </div>
                  <span className="text-white/40">›</span>
                </Link>
                <AffiliateBanner />
              </div>


              {/* REDES SOCIAIS — visível para o próprio dono do perfil */}
              {!profileId && (
                <div className="pt-8 space-y-6">
                  <div className="flex items-center gap-3 border-b border-white/5 pb-4">
                    <ExternalLink className="w-6 h-6 text-primary" />
                    <h3 className="text-xl font-black uppercase tracking-tighter">Redes Sociais</h3>
                  </div>
                  <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest -mt-2">
                    Aparecem no seu perfil público. Deixe em branco para ocultar.
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {[
                      { key: 'instagram', label: 'Instagram', placeholder: '@suaempresa', accent: 'focus:border-pink-500/50' },
                      { key: 'facebook',  label: 'Facebook',  placeholder: 'facebook.com/suaempresa', accent: 'focus:border-[#1877F2]/50' },
                      { key: 'tiktok',    label: 'TikTok',    placeholder: '@suaempresa', accent: 'focus:border-white/40' },
                      { key: 'site_url',  label: 'Site / Website', placeholder: 'https://www.suaempresa.com.br', accent: 'focus:border-blue-400/50' },
                    ].map((f) => (
                      <div key={f.key} className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{f.label}</label>
                        <input
                          type="text"
                          value={profile?.[f.key] ?? ''}
                          onChange={(e) => setProfile({ ...profile, [f.key]: e.target.value })}
                          placeholder={f.placeholder}
                          className={`w-full h-12 rounded-2xl bg-white/5 border border-white/10 px-4 text-sm outline-none transition-all ${f.accent}`}
                        />
                      </div>
                    ))}
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      disabled={savingSocial || !profile?.id}
                      onClick={async () => {
                        if (!profile?.id) return;
                        setSavingSocial(true);
                        try {
                          const patch = {
                            instagram: profile.instagram ?? null,
                            facebook: profile.facebook ?? null,
                            tiktok: profile.tiktok ?? null,
                            site_url: profile.site_url ?? null,
                          };
                          const extras: Record<string, unknown> = {
                            ...((profile.custom_sections as any)?.__extras || {}),
                          };
                          const payload: any = { ...patch };
                          let attempts = 0;
                          let lastError: any = null;
                          while (attempts < 6) {
                            attempts++;
                            const { error } = await supabaseExternal
                              .from('profiles')
                              .update(payload)
                              .eq('id', profile.id);
                            if (!error) { lastError = null; break; }
                            lastError = error;
                            const msg = error.message || '';
                            const m = msg.match(/'([^']+)'\s+column/i) || msg.match(/column\s+"([^"]+)"/i) || msg.match(/Could not find the '([^']+)'/i);
                            const col = m?.[1];
                            if (col && col in payload) {
                              extras[col] = payload[col];
                              delete payload[col];
                              payload.custom_sections = { ...(profile.custom_sections || {}), __extras: extras };
                              continue;
                            }
                            break;
                          }
                          if (lastError) throw lastError;
                          toast.success('Redes sociais atualizadas!', { description: 'As mudanças já aparecem no seu perfil público.' });
                          try {
                            window.dispatchEvent(new CustomEvent('fixxer:profile-updated', { detail: { id: profile.id } }));
                            window.dispatchEvent(new CustomEvent('fixxer:profile-saved', { detail: { id: profile.id } }));
                          } catch { /* noop */ }
                        } catch (e: any) {
                          toast.error('Não foi possível salvar as redes sociais.', { description: e?.message });
                        } finally {
                          setSavingSocial(false);
                        }
                      }}
                      className="inline-flex items-center gap-2 h-11 px-6 rounded-2xl bg-primary text-black font-black uppercase italic tracking-widest text-xs disabled:opacity-50 hover:bg-primary/90 transition-all"
                    >
                      {savingSocial ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                      {savingSocial ? 'Salvando...' : 'Salvar redes sociais'}
                    </button>
                    <span className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">
                      Atualiza imediatamente em todo o app.
                    </span>
                  </div>
                </div>
              )}

              {/* SEGURANÇA DA CONTA — senha + zona de perigo */}
              {!profileId && (
                <div className="pt-8 space-y-6">
                  <div className="flex items-center gap-3 border-b border-white/5 pb-4">
                    <BadgeCheck className="w-6 h-6 text-primary" />
                    <h3 className="text-xl font-black uppercase tracking-tighter">Segurança da Conta</h3>
                  </div>

                  <SecuritySection />
                </div>
              )}






              {/* CAMPOS ESPECÍFICOS: LOJISTA — Tipo de Produto (multi-seleção) */}
              {profile?.role === 'lojista' && (
                <div className="pt-8 space-y-6">
                  <div className="flex items-center gap-3 border-b border-white/5 pb-4">
                    <Building className="w-6 h-6 text-primary" />
                    <h3 className="text-xl font-black uppercase tracking-tighter">Tipo de Produto</h3>
                  </div>
                  <div className="space-y-4">
                    <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1">
                      Selecione um ou mais tipos que sua loja oferece
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {productTypes.map(pt => {
                        const selected: string[] = Array.isArray(profile?.product_types) ? profile.product_types : [];
                        const isOn = selected.includes(pt);
                        return (
                          <button
                            key={pt}
                            type="button"
                            aria-pressed={isOn}
                            onClick={() => {
                              const next = isOn ? selected.filter(x => x !== pt) : [...selected, pt];
                              setProfile({ ...profile, product_types: next });
                            }}
                            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all border ${isOn ? 'bg-primary text-black border-primary' : 'bg-white/5 border-white/10 hover:border-primary/50'}`}
                          >
                            {isOn ? '✓ ' : ''}{pt}
                          </button>
                        );
                      })}
                      <button
                        type="button"
                        onClick={() => setIsAddingProductType(true)}
                        className="px-4 py-2 rounded-xl text-xs font-bold bg-white/5 border border-dashed border-white/20 hover:border-primary text-muted-foreground hover:text-primary transition-all flex items-center gap-1"
                      >
                        <Plus className="w-3 h-3" />
                        Outro
                      </button>
                    </div>

                    {isAddingProductType && (
                      <div className="flex gap-2 animate-in slide-in-from-top-2 duration-300">
                        <input
                          autoFocus
                          value={newProductType}
                          onChange={e => setNewProductType(e.target.value)}
                          placeholder="Ex.: Locação, Assinatura, Consultoria..."
                          className="flex-1 bg-white/5 border border-white/10 p-3 rounded-xl text-sm outline-none focus:border-primary"
                        />
                        <button
                          type="button"
                          onClick={async () => {
                            const name = newProductType.trim();
                            if (!name) return;
                            if (productTypes.some(p => p.toLowerCase() === name.toLowerCase())) {
                              toast.info("Este tipo já está na lista.");
                              return;
                            }
                            // Persiste no catálogo compartilhado (ficará disponível para outros lojistas)
                            const { error } = await supabaseExternal.from('product_types').insert({ name });
                            if (error && !String(error.message || '').toLowerCase().includes('duplicate')) {
                              toast.error("Não foi possível salvar o novo tipo.", { description: error.message });
                              return;
                            }
                            const nextList = Array.from(new Set([...productTypes, name])).sort();
                            setProductTypes(nextList);
                            const selected: string[] = Array.isArray(profile?.product_types) ? profile.product_types : [];
                            setProfile({ ...profile, product_types: [...selected, name] });
                            setNewProductType("");
                            setIsAddingProductType(false);
                            toast.success(`"${name}" adicionado e disponível para outros lojistas.`);
                          }}
                          className="bg-primary text-black font-bold px-4 rounded-xl text-xs"
                        >
                          Adicionar
                        </button>
                        <button
                          type="button"
                          onClick={() => { setIsAddingProductType(false); setNewProductType(""); }}
                          className="bg-white/5 px-4 rounded-xl text-xs"
                        >
                          Cancelar
                        </button>
                      </div>
                    )}

                    <p className="text-[10px] text-muted-foreground/70 leading-relaxed">
                      💡 As opções personalizadas ("Outro") ficam disponíveis para outros lojistas escolherem também.
                    </p>
                  </div>
                </div>
              )}

              {/* CAMPOS ESPECÍFICOS: PRESTADOR */}
              {profile?.role === 'prestador' && (
                <div className="pt-8 space-y-6">

                  {/* ACEITA TRABALHOS COMO */}
                  <div id="aceita-trabalhos" className="pt-6 space-y-3 border-t border-white/5 scroll-mt-24">
                    {(() => {
                      const wmList: string[] = Array.isArray(profile?.work_modes) ? profile.work_modes.filter(Boolean) : [];
                      if (wmList.length > 0) return null;
                      return (
                        <div className="rounded-xl border border-red-500/40 bg-red-500/10 p-3 text-[11px] text-red-200 font-bold" role="alert">
                          ⚠️ Escolha ao menos um formato abaixo. Sem isso, o botão <b>Salvar Perfil</b> ficará bloqueado.
                        </div>
                      );
                    })()}
                    <h4 className="text-sm font-black uppercase tracking-tighter text-white">💼 Aceita trabalhos como</h4>
                    <p className="text-xs text-muted-foreground">
                      Selecione todos os formatos de contratação que você aceita. Aparecerá no seu perfil público.
                    </p>
                    {(() => {
                      const ALL_WORK_MODES = ['Contratos FreeLancer MEI', 'Contratos Fixos MEI', 'Contratação CLT', 'Serviços Individuais'] as const;
                      const list: string[] = Array.isArray(profile?.work_modes) ? profile.work_modes.filter(Boolean) : [];
                      const normalizedSet = new Set(list.map((m) => m.toLowerCase()));
                      const allSelected = ALL_WORK_MODES.every((m) => normalizedSet.has(m.toLowerCase()));
                      const toggleAll = () => {
                        // "Todos" alterna entre selecionar/limpar todos os formatos.
                        const next = allSelected ? [] : [...ALL_WORK_MODES];
                        setProfile({ ...profile, work_modes: next });
                      };
                      return (
                        <div className="space-y-2">
                          <label
                            className={`flex items-center gap-3 p-3 rounded-2xl border cursor-pointer transition-all ${
                              allSelected
                                ? 'bg-emerald-500/20 border-emerald-400/70'
                                : 'bg-white/5 border-white/10 hover:border-emerald-400/40'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={allSelected}
                              onChange={toggleAll}
                              className="w-5 h-5 accent-emerald-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
                              aria-label="Selecionar todos os formatos de contratação"
                            />
                            <span className="text-xs font-black uppercase tracking-widest flex-1">
                              ✅ Todos os formatos
                            </span>
                            <span className="text-[10px] text-white/60 font-bold">
                              {list.length}/{ALL_WORK_MODES.length}
                            </span>
                          </label>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {ALL_WORK_MODES.map((mode) => {
                              const active = normalizedSet.has(mode.toLowerCase());
                              return (
                                <label
                                  key={mode}
                                  className={`flex items-center gap-3 p-3 rounded-2xl border cursor-pointer transition-all ${
                                    active
                                      ? 'bg-primary/15 border-primary/60'
                                      : 'bg-white/5 border-white/10 hover:border-primary/40'
                                  }`}
                                >
                                  <input
                                    type="checkbox"
                                    checked={active}
                                    onChange={() => {
                                      // Persistimos array deduplicado preservando a ordem canônica dos ALL_WORK_MODES.
                                      const nextSet = new Set(normalizedSet);
                                      if (active) nextSet.delete(mode.toLowerCase());
                                      else nextSet.add(mode.toLowerCase());
                                      const next = ALL_WORK_MODES.filter((m) => nextSet.has(m.toLowerCase()));
                                      setProfile({ ...profile, work_modes: next });
                                    }}
                                    className="w-5 h-5 accent-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-[#121214] rounded"
                                    aria-label={`Aceita ${mode}`}
                                  />
                                  <span className="text-xs font-bold flex-1">{mode}</span>
                                </label>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })()}
                  </div>


                  {/* OFERECE */}
                  <div className="pt-6 space-y-4 border-t border-white/5">
                    <OfferingsPicker
                      selected={Array.isArray(profile?.offerings) ? profile.offerings : []}
                      planId={(String(profile?.plan_id || 'free').toLowerCase() as any)}
                      onChange={(next: string[]) => {
                        const hasVehicle = next.some((s: string) => s.toLowerCase() === 'veículo próprio');
                        setProfile({ ...profile, offerings: next, has_vehicle: hasVehicle });
                      }}
                      vehicleType={profile?.vehicle_type}
                      vehicleDescription={profile?.vehicle_description}
                      onVehicleTypeChange={(v: string) => setProfile({ ...profile, vehicle_type: v })}
                      onVehicleDescriptionChange={(v: string) => setProfile({ ...profile, vehicle_description: v })}
                      observations={profile?.offerings_notes}
                      onObservationsChange={(v: string) => setProfile({ ...profile, offerings_notes: v })}
                    />


                    {profile?.has_vehicle && (
                      <div className="space-y-4 pl-2 border-l-2 border-primary/30">
                        <label className="flex items-center gap-3 bg-white/5 p-4 rounded-2xl border border-white/10 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={profile?.available_for_transport || false}
                            onChange={e => setProfile({ ...profile, available_for_transport: e.target.checked })}
                            className="w-5 h-5 accent-primary"
                          />
                          <span className="text-xs font-bold">Disponibilizo veículo para trabalhos de transporte/frete</span>
                        </label>


                        {profile?.available_for_transport && (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1">Valor por Frete (R$)</label>
                              <input
                                type="number"
                                step="0.01"
                                value={profile?.freight_rate || ''}
                                onChange={e => setProfile({ ...profile, freight_rate: e.target.value })}
                                className="w-full bg-white/5 border border-white/10 focus:border-primary/50 p-4 rounded-2xl outline-none font-mono"
                              />
                            </div>
                            <div className="space-y-2">
                              <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1">Valor por KM Rodado (R$)</label>
                              <input
                                type="number"
                                step="0.01"
                                value={profile?.km_rate || ''}
                                onChange={e => setProfile({ ...profile, km_rate: e.target.value })}
                                className="w-full bg-white/5 border border-white/10 focus:border-primary/50 p-4 rounded-2xl outline-none font-mono"
                              />
                            </div>
                            <div className="md:col-span-2 space-y-2">
                              <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1">Pedágio</label>
                              <div className="flex gap-2">
                                {[
                                  { v: 'incluso', l: 'Incluso no valor' },
                                  { v: 'fora', l: 'Pago por fora' },
                                ].map(opt => (
                                  <button
                                    key={opt.v}
                                    type="button"
                                    onClick={() => setProfile({ ...profile, toll_policy: opt.v })}
                                    className={`flex-1 px-4 py-3 rounded-xl text-xs font-bold transition-all border ${profile?.toll_policy === opt.v ? 'bg-primary text-black border-primary' : 'bg-white/5 border-white/10 hover:border-primary/50'}`}
                                  >
                                    {opt.l}
                                  </button>
                                ))}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* DISPONIBILIDADE / HORÁRIOS */}
                  <div className="pt-6 space-y-4 border-t border-white/5">
                    <h4 className="text-sm font-black uppercase tracking-tighter text-white">🕒 Disponibilidade de Atendimento</h4>

                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1">Dias da Semana</label>
                      <div className="flex flex-wrap gap-2">
                        {['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'].map(day => {
                          const days = profile?.working_days || [];
                          const active = days.includes(day);
                          return (
                            <button
                              key={day}
                              type="button"
                              onClick={() => {
                                const next = active ? days.filter((d: string) => d !== day) : [...days, day];
                                setProfile({ ...profile, working_days: next });
                              }}
                              className={`w-14 h-14 rounded-2xl text-xs font-black uppercase transition-all border ${active ? 'bg-primary text-black border-primary shadow-[0_0_15px_rgba(0,255,135,0.4)]' : 'bg-white/5 border-white/10 hover:border-primary/50 text-muted-foreground'}`}
                            >
                              {day}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1">Início do Atendimento</label>
                        <input
                          type="time"
                          value={profile?.work_start_time || ''}
                          onChange={e => setProfile({ ...profile, work_start_time: e.target.value })}
                          className="w-full bg-white/5 border border-white/10 focus:border-primary/50 p-4 rounded-2xl outline-none font-mono"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1">Fim do Atendimento</label>
                        <input
                          type="time"
                          value={profile?.work_end_time || ''}
                          onChange={e => setProfile({ ...profile, work_end_time: e.target.value })}
                          className="w-full bg-white/5 border border-white/10 focus:border-primary/50 p-4 rounded-2xl outline-none font-mono"
                        />
                      </div>
                    </div>

                    <label className="flex items-start gap-3 bg-white/5 p-4 rounded-2xl border border-white/10 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={profile?.receive_off_hours_notifications || false}
                        onChange={e => setProfile({ ...profile, receive_off_hours_notifications: e.target.checked })}
                        className="w-5 h-5 accent-primary mt-0.5"
                      />
                      <span className="text-xs font-bold leading-snug">
                        Aceito receber avisos de propostas fora do meu horário e dias de atendimento
                      </span>
                    </label>
                  </div>
                </div>
              )}
              {/* MATRIZ MULTI-SETORIAL DE RAMOS DE ATIVIDADE */}
              {(profile?.role === 'fornecedor' || profile?.role === 'prestador' || profile?.role === 'lojista') && (
                <div className="pt-8 space-y-6">
                  <div className="flex items-center gap-3 border-b border-white/5 pb-4">
                    <Briefcase className="w-6 h-6 text-primary" />
                    <div className="min-w-0">
                      <h3 className="text-xl font-black uppercase tracking-tighter">Ramo Principal de Atividade</h3>
                      <p className="text-[11px] text-white/50 mt-1 break-words">
                        Selecione uma das 9 categorias oficiais ou digite um ramo customizado — sugerimos automaticamente uma correspondência oficial quando existir.
                      </p>
                    </div>
                  </div>

                  <PreferredServicePicker
                    profile={profile}
                    setProfile={setProfile}
                    accent={theme.hex}
                    planId={(String(profile?.plan_id || 'free').toLowerCase() as any)}
                  />

                  {/* ESPECIALIDADES */}
                  <div className="pt-8 border-t border-white/5">
                    <SpecialtiesEditor
                      value={Array.isArray(profile?.specialties) ? profile.specialties : []}
                      onChange={(next: Specialty[]) => setProfile({ ...profile, specialties: next })}
                      planId={(String(profile?.plan_id || 'free').toLowerCase() as any)}
                      userId={profile?.id}
                    />
                  </div>

                </div>
              )}

            </section>
          </div>


          <div className="space-y-8">
            {/* PRÉVIA AO VIVO DO PERFIL PÚBLICO */}
            {!profileId && (
              <LiveProfilePreview
                aboutBio={profile?.about_bio}
                sections={profile?.custom_sections}
                portfolioImages={profile?.portfolio_media}
                companyName={profile?.company_name}
                fullName={profile?.full_name}
                displayName={profile?.display_name}
                accentHex={theme.hex}
                workModes={Array.isArray(profile?.work_modes) ? profile.work_modes : []}
                offerings={Array.isArray(profile?.offerings) ? profile.offerings : []}
                offeringsNotes={profile?.offerings_notes}
                vehicleType={profile?.vehicle_type}
                vehicleDescription={profile?.vehicle_description}
                specialties={Array.isArray(profile?.specialties) ? profile.specialties : []}
              />
            )}
            {/* CENTRAL DE MÍDIA COMPACTA - REFORMULADA */}
            <section className="bg-card/30 backdrop-blur-xl border border-white/10 p-6 rounded-[2rem] shadow-2xl space-y-6">
              <div className="flex items-center gap-3 border-b border-white/5 pb-4">
                <Upload className="w-5 h-5 text-primary" />
                <h3 className="text-lg font-black uppercase tracking-tighter">Mídia & Documentos</h3>
              </div>

              {/* Painel de status dos uploads */}
              {uploads.length > 0 && (
                <div className="rounded-2xl border border-white/10 bg-black/40 p-3 space-y-2" role="status" aria-live="polite">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <p className="text-[10px] font-black uppercase tracking-widest text-primary">
                      Envios em andamento ({uploads.filter(u => u.status === 'uploading').length}/{uploads.length})
                      {uploads.some(u => u.status === 'error') && (
                        <span className="ml-2 text-red-400">· {uploads.filter(u => u.status === 'error').length} falha(s)</span>
                      )}
                    </p>
                    <div className="flex items-center gap-2">
                      {uploads.some(u => u.status === 'error' && u.file) && (
                        <button
                          type="button"
                          onClick={retryFailedUploads}
                          className="text-[9px] font-black uppercase px-2 py-1 rounded-md bg-red-500/20 text-red-300 border border-red-500/40 hover:bg-red-500/30 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-400"
                        >
                          ↻ Reenviar falhas
                        </button>
                      )}
                      {uploads.every(u => u.status !== 'uploading') && (
                        <button
                          type="button"
                          onClick={() => setUploads([])}
                          className="text-[9px] font-black uppercase text-muted-foreground hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-white/40 rounded-md px-1"
                        >
                          Limpar
                        </button>
                      )}
                    </div>
                  </div>

                  {uploads.map((u) => (
                    <div key={u.id} className="space-y-1">
                      <div className="flex items-center justify-between text-[10px]">
                        <span className="truncate text-white/80 max-w-[70%]" title={u.name}>{u.name}</span>
                        <span className={`font-black uppercase ${u.status === 'success' ? 'text-emerald-400' : u.status === 'error' ? 'text-red-400' : 'text-amber-300'}`}>
                          {u.status === 'uploading' ? 'Enviando…' : u.status === 'success' ? '✓ Concluído' : '✕ Falhou'}
                        </span>
                      </div>
                      <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
                        <div className={`h-full transition-all ${u.status === 'success' ? 'bg-emerald-400 w-full' : u.status === 'error' ? 'bg-red-400 w-full' : 'bg-primary w-2/3 animate-pulse'}`} />
                      </div>
                      {u.status === 'error' && u.error && (
                        <p className="text-[9px] text-red-300/90 italic">{u.error}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}

              <div className="space-y-8">
                {/* DOCUMENTOS */}
                <div className="space-y-4">
                  <h4 className="text-[10px] font-black text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                    <FileText className="w-3 h-3" /> Documentos (PDF, DOC, XLS)
                    <span className="ml-auto text-[9px] text-white/50 normal-case italic">Arraste ou use ← → para reordenar</span>
                  </h4>
                  <p className="text-[9px] text-white/60 -mt-2">
                    Formatos aceitos: <b>{UPLOAD_LIMITS.document.hint}</b> · Tamanho máx.: <b>{UPLOAD_LIMITS.document.maxLabel}</b>. Foque um item (Tab) e use setas/Home/End para mover; Enter abre a prévia.
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3" role="list" aria-label="Documentos enviados, reordenáveis por arrastar ou setas do teclado">

                    {(() => {
                      const docs = profile?.documents?.filter((f: any) => f.type === 'document') || [];
                      const total = docs.length;
                      return docs.map((doc: any, i: number) => (
                        <DocItem
                          key={doc.path || doc.url || i}
                          doc={doc}
                          index={i}
                          total={total}
                          onDragStart={() => { dragRef.current = { list: 'doc', index: i }; }}
                          onDrop={() => {
                            const src = dragRef.current;
                            if (src && src.list === 'doc') reorderMedia('doc', src.index, i);
                            dragRef.current = null;
                          }}
                          onReorderKey={(ev, kind, url) => {
                            if (ev.key === 'Enter') {
                              ev.preventDefault();
                              if (url) setPreview({ open: true, url, name: doc.name, kind });
                              return;
                            }
                            handleReorderKeyDown(ev, 'doc', i, total);
                          }}
                          onPreview={(url, kind) => setPreview({ open: true, url, name: doc.name, kind })}
                          onRemove={() => {
                            if (window.confirm(`Remover "${doc.name}"?`)) removeMediaItem('doc', i);
                          }}
                        />
                      ));
                    })()}

                    <label className="border-2 border-dashed border-white/10 rounded-xl p-4 flex flex-col items-center justify-center gap-2 hover:border-primary/50 focus-within:border-primary focus-within:ring-2 focus-within:ring-primary transition-all cursor-pointer group">
                      <Plus className="w-4 h-4 text-muted-foreground group-hover:text-primary" />
                      <span className="text-[9px] font-black uppercase text-muted-foreground group-hover:text-primary">Novo Documento</span>
                      <span className="text-[8px] text-white/40 normal-case">{UPLOAD_LIMITS.document.hint} · máx {UPLOAD_LIMITS.document.maxLabel}</span>
                      <input type="file" className="sr-only" accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,image/*" onChange={(e) => handleMediaUpload(e, 'document')} aria-label="Enviar novo documento" />
                    </label>

                  </div>
                </div>


                {/* IMAGENS / GALERIA PINTEREST */}
                <div className="space-y-4">
                  <h4 className="text-[10px] font-black text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                    <Camera className="w-3 h-3" /> Galeria de Imagens
                    <span className="ml-auto text-[9px] text-amber-400/90">💰 6 grátis · +5 moedas/foto extra · arraste ou ← → p/ reordenar</span>
                  </h4>
                  <p className="text-[9px] text-white/60 -mt-2">
                    Formatos aceitos: <b>{UPLOAD_LIMITS.image.hint}</b> · Tamanho máx.: <b>{UPLOAD_LIMITS.image.maxLabel}</b>. Foque uma imagem (Tab) e use setas para reordenar; Enter abre a prévia.
                  </p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3" role="list" aria-label="Galeria de imagens, reordenável por arrastar ou setas do teclado">

                    {profile?.portfolio_media?.filter((f: any) => f.type === 'image').map((img: any, i: number) => (
                      <div
                        key={i}
                        role="listitem"
                        tabIndex={0}
                        aria-label={`Imagem ${i + 1} de ${profile?.portfolio_media?.filter((f: any) => f.type === 'image').length || 0}. Setas para reordenar, Enter para pré-visualizar.`}
                        draggable
                        onDragStart={() => { dragRef.current = { list: 'image', index: i }; }}
                        onDragOver={(ev) => ev.preventDefault()}
                        onDrop={(ev) => {
                          ev.preventDefault();
                          const src = dragRef.current;
                          if (src && src.list === 'image') reorderMedia('image', src.index, i);
                          dragRef.current = null;
                        }}
                        onKeyDown={(ev) => {
                          const total = profile?.portfolio_media?.filter((f: any) => f.type === 'image').length || 0;
                          if (ev.key === 'Enter') { ev.preventDefault(); setPreview({ open: true, url: img.url, name: img.name || 'Imagem', kind: 'image' }); return; }
                          handleReorderKeyDown(ev, 'image', i, total);
                        }}
                        className="relative group rounded-xl overflow-hidden cursor-grab active:cursor-grabbing shadow-lg aspect-square focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                        onClick={() => setPreview({ open: true, url: img.url, name: img.name || 'Imagem', kind: 'image' })}
                      >

                        <img src={img.url} alt={img.name || 'Portfolio'} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); setPreview({ open: true, url: img.url, name: img.name || 'Imagem', kind: 'image' }); }}
                            className="bg-white/10 p-2 rounded-full backdrop-blur-md hover:bg-primary hover:text-black"
                            title="Pré-visualizar"
                            aria-label="Pré-visualizar imagem"
                          >
                            <Search className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (window.confirm('Remover esta imagem?')) removeMediaItem('image', i);
                            }}
                            className="bg-white/10 p-2 rounded-full backdrop-blur-md hover:bg-red-500"
                            title="Remover"
                            aria-label="Remover imagem"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                    <label className="w-full aspect-square border-2 border-dashed border-white/10 rounded-xl flex flex-col items-center justify-center gap-2 hover:border-primary/50 focus-within:border-primary focus-within:ring-2 focus-within:ring-primary transition-all cursor-pointer group text-center px-2">
                      <Plus className="w-6 h-6 text-muted-foreground group-hover:text-primary" />
                      <span className="text-[8px] text-white/50 leading-tight">{UPLOAD_LIMITS.image.hint}<br/>máx {UPLOAD_LIMITS.image.maxLabel}</span>
                      <input type="file" className="sr-only" accept="image/*" multiple onChange={(e) => handleMediaUpload(e, 'image')} aria-label="Enviar novas imagens" />
                    </label>
                  </div>
                </div>

                {/* VÍDEOS */}
                <div className="space-y-4">
                  <h4 className="text-[10px] font-black text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                    <Play className="w-3 h-3" /> Vídeos & Demonstrações
                    <span className="ml-auto text-[9px] text-amber-400/90">💰 1 grátis · +10 moedas/vídeo extra · ← → p/ reordenar</span>
                  </h4>
                  <p className="text-[9px] text-white/60 -mt-2">
                    Formatos aceitos: <b>{UPLOAD_LIMITS.video.hint}</b> · Tamanho máx.: <b>{UPLOAD_LIMITS.video.maxLabel}</b>. Foque um vídeo (Tab) e use setas para reordenar.
                  </p>
                  <div className="grid grid-cols-1 gap-4" role="list" aria-label="Vídeos enviados, reordenáveis por arrastar ou setas do teclado">
                    {profile?.portfolio_media?.filter((f: any) => f.type === 'video').map((vid: any, i: number) => (
                      <div
                        key={i}
                        role="listitem"
                        tabIndex={0}
                        aria-label={`Vídeo ${i + 1} de ${profile?.portfolio_media?.filter((f: any) => f.type === 'video').length || 0}. Setas para reordenar.`}
                        draggable
                        onDragStart={() => { dragRef.current = { list: 'video', index: i }; }}
                        onDragOver={(ev) => ev.preventDefault()}
                        onDrop={(ev) => {
                          ev.preventDefault();
                          const src = dragRef.current;
                          if (src && src.list === 'video') reorderMedia('video', src.index, i);
                          dragRef.current = null;
                        }}
                        onKeyDown={(ev) => {
                          const total = profile?.portfolio_media?.filter((f: any) => f.type === 'video').length || 0;
                          handleReorderKeyDown(ev, 'video', i, total);
                        }}
                        className="relative group rounded-2xl overflow-hidden bg-black aspect-video border border-white/5 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                      >
                        <video src={vid.url} className="w-full h-full object-cover opacity-60 group-hover:opacity-100 transition-opacity" controls />
                        <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
                          <button
                            type="button"
                            onClick={() => setPreview({ open: true, url: vid.url, name: vid.name || 'Vídeo', kind: 'other' })}
                            className="bg-black/60 p-2 rounded-xl backdrop-blur-md hover:bg-primary hover:text-black"
                            title="Pré-visualizar"
                            aria-label="Pré-visualizar vídeo"
                          >
                            <Search className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              if (window.confirm('Remover este vídeo?')) removeMediaItem('video', i);
                            }}
                            className="bg-black/60 p-2 rounded-xl backdrop-blur-md hover:bg-red-500"
                            title="Remover"
                            aria-label="Remover vídeo"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                    <label className="border-2 border-dashed border-white/10 rounded-2xl p-8 flex flex-col items-center justify-center gap-3 hover:border-primary/50 focus-within:border-primary focus-within:ring-2 focus-within:ring-primary transition-all cursor-pointer group text-center">
                      <Play className="w-8 h-8 text-muted-foreground group-hover:text-primary" />
                      <span className="text-xs font-bold uppercase text-muted-foreground group-hover:text-primary">Upload de Vídeo</span>
                      <span className="text-[9px] text-white/50 normal-case">{UPLOAD_LIMITS.video.hint} · máx {UPLOAD_LIMITS.video.maxLabel}</span>
                      <input type="file" className="sr-only" accept="video/*" onChange={(e) => handleMediaUpload(e, 'video')} aria-label="Enviar novo vídeo" />
                    </label>

                  </div>
                </div>



                {/* DEPOIMENTOS */}
                <div className="pt-4 border-t border-white/5 space-y-4">
                  <h4 className="text-[10px] font-black text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                    <MessageSquare className="w-3 h-3" /> Depoimentos Recebidos
                  </h4>
                  <div className="space-y-3">
                    {profile?.testimonials?.length > 0 ? (
                      profile.testimonials.map((t: any, i: number) => (
                        <div key={i} className="bg-white/5 border border-white/5 p-4 rounded-2xl">
                          <p className="text-xs italic text-muted-foreground mb-2">"{t.content}"</p>
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-black text-primary uppercase">{t.author}</span>
                            <div className="flex gap-1 text-primary">
                              {[...Array(5)].map((_, j) => <Star key={j} className={`w-2 h-2 ${j < t.rating ? 'fill-primary' : 'opacity-20'}`} />)}
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-center p-6 bg-white/5 rounded-2xl border border-dashed border-white/10">
                        <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Nenhum depoimento ainda</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </section>

          </div>
        </div>
      </div>

      {/* LIGHTBOX / CARROSSEL */}
      {lightbox.isOpen && (
        <div className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-xl flex items-center justify-center p-4 animate-in fade-in duration-300">
          <button onClick={() => setLightbox({ ...lightbox, isOpen: false })} className="absolute top-6 right-6 text-white/60 hover:text-white bg-white/10 p-3 rounded-2xl transition-all">
            <X className="w-6 h-6" />
          </button>
          
          <div className="relative max-w-5xl w-full h-[80vh] flex items-center justify-center">
            {lightbox.type === 'image' && (
              <img src={lightbox.url} className="max-w-full max-h-full object-contain rounded-2xl shadow-2xl animate-in zoom-in-95 duration-500" alt="Full view" />
            )}
            
            <button 
              onClick={() => {
                const media = profile.portfolio_media.filter((f: any) => f.type === lightbox.type);
                const nextIdx = (lightbox.index - 1 + media.length) % media.length;
                setLightbox({ ...lightbox, index: nextIdx, url: media[nextIdx].url });
              }}
              className="absolute left-0 bg-white/5 hover:bg-primary hover:text-black p-4 rounded-2xl border border-white/10 transition-all"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
            
            <button 
              onClick={() => {
                const media = profile.portfolio_media.filter((f: any) => f.type === lightbox.type);
                const nextIdx = (lightbox.index + 1) % media.length;
                setLightbox({ ...lightbox, index: nextIdx, url: media[nextIdx].url });
              }}
              className="absolute right-0 bg-white/5 hover:bg-primary hover:text-black p-4 rounded-2xl border border-white/10 transition-all"
            >
              <ChevronRight className="w-6 h-6" />
            </button>
          </div>
        </div>
      )}

      {/* MODAL DE PRÉ-VISUALIZAÇÃO (imagem / PDF / documento) */}
      {preview.open && (
        <div
          className="fixed inset-0 z-[110] bg-black/95 backdrop-blur-xl flex items-center justify-center p-4 animate-in fade-in duration-200"
          role="dialog"
          aria-modal="true"
          aria-label={`Pré-visualização de ${preview.name}`}
          onClick={() => setPreview({ ...preview, open: false })}
        >
          <div className="relative w-full max-w-5xl h-[85vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3 gap-3">
              <p className="text-xs sm:text-sm font-black text-white truncate flex-1" title={preview.name}>
                {preview.name}
              </p>
              <a
                href={preview.url}
                target="_blank"
                rel="noreferrer"
                className="text-[10px] font-black uppercase bg-white/10 hover:bg-primary hover:text-black px-3 py-2 rounded-xl transition-all flex items-center gap-2"
              >
                <ExternalLink className="w-3 h-3" /> Abrir
              </a>
              <button
                onClick={() => setPreview({ ...preview, open: false })}
                className="text-white/70 hover:text-white bg-white/10 hover:bg-red-500/80 p-2 rounded-xl transition-all"
                aria-label="Fechar pré-visualização"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 bg-black/40 rounded-2xl overflow-hidden flex items-center justify-center border border-white/10">
              {preview.kind === 'image' ? (
                <img src={preview.url} alt={preview.name} className="max-w-full max-h-full object-contain" />
              ) : preview.kind === 'pdf' ? (
                <iframe src={preview.url} title={preview.name} className="w-full h-full bg-white" />
              ) : (
                <div className="flex flex-col items-center gap-3 text-center p-8">
                  <File className="w-16 h-16 text-primary" />
                  <p className="text-sm text-white/80">Este tipo de arquivo não pode ser pré-visualizado no navegador.</p>
                  <a
                    href={preview.url}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-2 px-4 py-2 rounded-xl bg-primary text-black text-xs font-black uppercase"
                  >
                    Abrir em nova aba
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>

  );
}


/* ============================================================
 * SecuritySection — Alterar senha + Zona de perigo (excluir conta)
 * Usa Supabase Auth externo (supabaseExternal) para operações.
 * ============================================================ */
function SecuritySection() {
  const [email, setEmail] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [currentPwd, setCurrentPwd] = useState("");
  const [newPwd, setNewPwd] = useState("");
  const [confirmPwd, setConfirmPwd] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [pwdSaving, setPwdSaving] = useState(false);
  const [pwdTouched, setPwdTouched] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState("");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabaseExternal.auth.getUser();
      setEmail(data.user?.email ?? null);
      setUserId(data.user?.id ?? null);
    })();
  }, []);

  // Validação da nova senha — mensagens específicas e progressivas
  const pwdErrors = useMemo(() => {
    const errs: string[] = [];
    if (!currentPwd) errs.push("Informe a senha atual.");
    if (newPwd.length < 8) errs.push("Nova senha precisa ter no mínimo 8 caracteres.");
    if (!/[A-Za-z]/.test(newPwd)) errs.push("A nova senha precisa ter ao menos uma letra.");
    if (!/[0-9]/.test(newPwd)) errs.push("A nova senha precisa ter ao menos um número.");
    if (newPwd && currentPwd && newPwd === currentPwd) errs.push("A nova senha deve ser diferente da atual.");
    if (!confirmPwd) errs.push("Confirme a nova senha.");
    else if (newPwd !== confirmPwd) errs.push("A confirmação não confere com a nova senha.");
    return errs;
  }, [currentPwd, newPwd, confirmPwd]);
  const pwdValid = pwdErrors.length === 0;

  const handleChangePassword = async () => {
    setPwdTouched(true);
    if (!pwdValid) {
      toast.error(pwdErrors[0]);
      return;
    }
    setPwdSaving(true);
    try {
      if (!email) throw new Error("Sessão não identificada.");
      const { error: signErr } = await supabaseExternal.auth.signInWithPassword({
        email,
        password: currentPwd,
      });
      if (signErr) {
        toast.error("Senha atual incorreta.", { description: "Verifique e tente novamente." });
        setPwdSaving(false);
        return;
      }
      const { error } = await supabaseExternal.auth.updateUser({ password: newPwd });
      if (error) throw error;
      toast.success("Senha atualizada com sucesso!", { description: "Use a nova senha nos próximos logins." });
      setCurrentPwd(""); setNewPwd(""); setConfirmPwd(""); setPwdTouched(false);
    } catch (e: any) {
      toast.error("Não foi possível alterar a senha.", { description: e?.message });
    } finally {
      setPwdSaving(false);
    }
  };

  const deleteToken = confirmDelete.trim().toUpperCase();
  const canOpenDeleteDialog = deleteToken === "EXCLUIR" && !!userId;

  const handleDeleteAccount = async () => {
    if (!canOpenDeleteDialog) return;
    setDeleting(true);
    try {
      const { error } = await supabaseExternal
        .from("profiles")
        .update({ status: "excluido", updated_at: new Date().toISOString() })
        .eq("id", userId!);
      if (error) throw error;
      try {
        window.dispatchEvent(new CustomEvent("fixxer:profile-updated", { detail: { id: userId } }));
        window.dispatchEvent(new CustomEvent("fixxer:profile-saved", { detail: { id: userId } }));
      } catch { /* noop */ }
      await supabaseExternal.auth.signOut();
      toast.success("Conta marcada para exclusão.", { description: "Fale com o suporte em até 30 dias para reverter." });
      setDeleteDialogOpen(false);
      window.location.href = "/";
    } catch (e: any) {
      toast.error("Falha ao excluir conta.", { description: e?.message });
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Alterar Senha */}
      <div className="p-5 rounded-2xl bg-white/5 border border-white/10 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center text-primary">🔒</div>
            <div>
              <div className="text-sm font-black text-white uppercase tracking-tight">Alterar Senha</div>
              <div className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">Mínimo 8 caracteres com letra e número.</div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setShowPwd(v => !v)}
            className="text-[10px] font-black uppercase tracking-widest text-muted-foreground hover:text-primary transition-colors"
          >
            {showPwd ? "Ocultar" : "Mostrar"}
          </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <input
            type={showPwd ? "text" : "password"}
            value={currentPwd}
            onChange={(e) => setCurrentPwd(e.target.value)}
            onBlur={() => setPwdTouched(true)}
            placeholder="Senha atual"
            autoComplete="current-password"
            className="h-12 rounded-2xl bg-black/40 border border-white/10 px-4 text-sm outline-none focus:border-primary/50"
          />
          <input
            type={showPwd ? "text" : "password"}
            value={newPwd}
            onChange={(e) => setNewPwd(e.target.value)}
            onBlur={() => setPwdTouched(true)}
            placeholder="Nova senha"
            autoComplete="new-password"
            className="h-12 rounded-2xl bg-black/40 border border-white/10 px-4 text-sm outline-none focus:border-primary/50"
          />
          <input
            type={showPwd ? "text" : "password"}
            value={confirmPwd}
            onChange={(e) => setConfirmPwd(e.target.value)}
            onBlur={() => setPwdTouched(true)}
            placeholder="Confirmar nova senha"
            autoComplete="new-password"
            className="h-12 rounded-2xl bg-black/40 border border-white/10 px-4 text-sm outline-none focus:border-primary/50"
          />
        </div>

        {pwdTouched && !pwdValid && (
          <ul className="text-[11px] text-red-300/90 space-y-1 pl-1">
            {pwdErrors.map((err) => (
              <li key={err} className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
                {err}
              </li>
            ))}
          </ul>
        )}

        <button
          onClick={handleChangePassword}
          disabled={pwdSaving || !pwdValid}
          className="inline-flex items-center gap-2 w-full md:w-auto px-8 h-12 rounded-2xl bg-primary text-black font-black uppercase italic tracking-widest disabled:opacity-40 hover:bg-primary/90 transition-all"
        >
          {pwdSaving && <Loader2 className="w-4 h-4 animate-spin" />}
          {pwdSaving ? "Atualizando..." : "Atualizar Senha"}
        </button>
      </div>

      {/* Zona de Perigo */}
      <div className="p-5 rounded-2xl bg-red-500/5 border border-red-500/30 space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-red-500/10 flex items-center justify-center text-red-400">⚠️</div>
          <div>
            <div className="text-sm font-black text-red-300 uppercase tracking-tight">Zona de Perigo</div>
            <div className="text-[10px] text-red-300/70 uppercase tracking-widest font-bold">
              A exclusão remove seu acesso e oculta seu perfil público. Ação irreversível pelo próprio usuário.
            </div>
          </div>
        </div>
        <div className="flex flex-col md:flex-row gap-3">
          <input
            type="text"
            value={confirmDelete}
            onChange={(e) => setConfirmDelete(e.target.value)}
            placeholder='Digite EXCLUIR para habilitar o botão'
            className="flex-1 h-12 rounded-2xl bg-black/40 border border-red-500/30 px-4 text-sm outline-none focus:border-red-500/60 uppercase tracking-wider"
          />
          <button
            type="button"
            onClick={() => setDeleteDialogOpen(true)}
            disabled={!canOpenDeleteDialog || deleting}
            className="px-8 h-12 rounded-2xl bg-red-500 hover:bg-red-500/90 text-white font-black uppercase italic tracking-widest disabled:opacity-40 transition-all"
          >
            Excluir Minha Conta
          </button>
        </div>
        {confirmDelete && deleteToken !== "EXCLUIR" && (
          <p className="text-[11px] text-red-300/80">
            Para prosseguir, digite exatamente <b>EXCLUIR</b> (maiúsculas ou minúsculas).
          </p>
        )}

        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent className="bg-black border border-red-500/40">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-red-300 uppercase tracking-tighter">
                Confirmar exclusão da conta
              </AlertDialogTitle>
              <AlertDialogDescription className="text-white/70 space-y-3">
                <span className="block">Esta ação é <b className="text-red-300">irreversível</b> pelo próprio usuário. Ao confirmar, o seguinte acontecerá:</span>
                <ul className="text-[13px] space-y-1.5 pl-4 list-disc marker:text-red-400">
                  <li>Seu perfil público (<b>{email ?? "sua conta"}</b>) deixa de aparecer nas buscas e carrosséis.</li>
                  <li>Você será desconectado imediatamente de todos os dispositivos.</li>
                  <li>Serviços, anúncios e posts atrelados à conta ficarão ocultos.</li>
                  <li>Conversas em andamento não recebem novas mensagens suas.</li>
                  <li>Saldo de moedas e histórico ficam retidos por 30 dias para eventual restauração via suporte.</li>
                </ul>
                <span className="block text-[12px] text-red-300/80">
                  Após 30 dias, os dados podem ser removidos definitivamente e não poderão ser recuperados.
                </span>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={deleting} className="bg-white/5 border-white/10 text-white hover:bg-white/10">
                Cancelar
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={(e) => { e.preventDefault(); handleDeleteAccount(); }}
                disabled={deleting}
                className="bg-red-500 hover:bg-red-600 text-white font-black uppercase tracking-widest"
              >
                {deleting ? (
                  <span className="inline-flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Excluindo…</span>
                ) : (
                  "Sim, excluir definitivamente"
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}





