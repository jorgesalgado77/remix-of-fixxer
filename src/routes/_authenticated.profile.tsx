import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect, useMemo, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Camera, MapPin, Save, User, Star, BadgeCheck, Upload, Trash2, Plus, Search, Building, Briefcase, FileText, File, FileSpreadsheet, Play, X, ChevronLeft, ChevronRight, MessageSquare, ExternalLink } from "lucide-react";
import { compressImage } from "@/utils/image-compression";
import { MaskedInput, applyCepMask } from "@/components/MaskedInput";

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
import { ALLOWED_RADII_KM, isAllowedRadius, BIO_MAX_LENGTH } from "@/lib/branch-search";
import { CoinBalanceBadge } from "@/components/CoinBalanceBadge";
import { PlanBadge } from "@/components/PlanBadge";
import { LiveProfilePreview } from "@/components/LiveProfilePreview";
import { saveDraft, loadDraft, clearDraft, markPending, pickDraftPatch } from "@/lib/profile-draft";

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
    };
  },
  component: ProfilePage,
});

function ProfilePage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [autoSaving, setAutoSaving] = useState(false);
  const [profile, setProfile] = useState<any>(null);
  const [brands, setBrands] = useState<string[]>([]);
  const [newBrand, setNewBrand] = useState("");
  const [isAddingBrand, setIsAddingBrand] = useState(false);
  const [lightbox, setLightbox] = useState<{ isOpen: boolean; type: string; url: string; index: number }>({ isOpen: false, type: '', url: '', index: 0 });
  const lastSavedSnapshotRef = useRef<string>('');
  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);


  const { id: profileId, context: postId } = Route.useSearch() as { id?: string; context?: string };
  const [targetPost, setTargetPost] = useState<any>(null);

  useEffect(() => {
    async function loadData() {
      const { data: { user } } = await supabase.auth.getUser();
      
      // Se tiver ID na URL, carrega esse perfil. Se não, carrega o do usuário logado.
      const idToLoad = profileId || user?.id;
      if (!idToLoad) return;

      const [profileRes, brandsRes, postRes] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', idToLoad).single(),
        supabase.from('brand_flags').select('name').order('name', { ascending: true }),
        postId ? supabase.from('feed_posts').select('*').eq('id', postId).single() : Promise.resolve({ data: null })
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

      const { supabaseExternal } = await import("@/lib/supabaseExternal");
      const fileExt = (file.name.split('.').pop() || 'jpg').toLowerCase();
      const filePath = `profiles/${profile.id}/${type}-${Date.now()}.${fileExt}`;

      // Tenta primeiro no cliente externo (fonte de verdade). Faz fallback para o interno se necessário.
      let publicUrl: string | null = null;
      try {
        const { error: upErr } = await supabaseExternal.storage
          .from('media')
          .upload(filePath, processed, { upsert: true, cacheControl: '3600', contentType: processed.type || 'image/jpeg' });
        if (upErr) throw upErr;
        publicUrl = supabaseExternal.storage.from('media').getPublicUrl(filePath).data.publicUrl;
      } catch (extErr) {
        console.warn("[upload] externo falhou, tentando interno:", extErr);
        const { error: upErr2 } = await supabase.storage
          .from('media')
          .upload(filePath, processed, { upsert: true, cacheControl: '3600', contentType: processed.type || 'image/jpeg' });
        if (upErr2) throw upErr2;
        publicUrl = supabase.storage.from('media').getPublicUrl(filePath).data.publicUrl;
      }

      const field = type === 'avatar' ? 'avatar_url' : 'banner_url';

      // Atualiza no externo (fonte de verdade) e replica no interno best-effort.
      try {
        const { error } = await supabaseExternal.from('profiles').update({ [field]: publicUrl }).eq('id', profile.id);
        if (error) throw error;
      } catch (extUpdErr) {
        console.warn("[profile update] externo falhou, tentando interno:", extUpdErr);
        await supabase.from('profiles').update({ [field]: publicUrl }).eq('id', profile.id);
      }

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


  const handleMediaUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'image' | 'video' | 'document') => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB
    const MAX_VIDEO_SIZE = 50 * 1024 * 1024; // 50MB
    const MAX_DOC_SIZE = 10 * 1024 * 1024; // 10MB

    const allowedImageTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/gif'];
    const allowedVideoTypes = ['video/mp4', 'video/webm', 'video/quicktime'];
    const allowedDocTypes = [
      'application/pdf', 
      'application/msword', 
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'text/plain'
    ];

    try {
      setSaving(true);
      const newMedia = [];
      const newDocs = [];

      // ---- Cobrança de excedentes: fotos (5 moedas) / vídeos (10 moedas) ----
      const FREE_PHOTOS = 6;
      const FREE_VIDEOS = 1;
      if (type === 'image' || type === 'video') {
        const existing = (profile?.portfolio_media || []).filter((f: any) => f.type === type).length;
        const incoming = files.length;
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


      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        
        // Validation
        if (type === 'image') {
          if (!allowedImageTypes.includes(file.type)) {
            toast.error(`Arquivo "${file.name}" não é uma imagem suportada.`);
            continue;
          }
          if (file.size > MAX_IMAGE_SIZE) {
            toast.error(`Imagem "${file.name}" excede o limite de 5MB.`);
            continue;
          }
        } else if (type === 'video') {
          if (!allowedVideoTypes.includes(file.type)) {
            toast.error(`Arquivo "${file.name}" não é um vídeo suportado.`);
            continue;
          }
          if (file.size > MAX_VIDEO_SIZE) {
            toast.error(`Vídeo "${file.name}" excede o limite de 50MB.`);
            continue;
          }
        } else if (type === 'document') {
          if (!allowedDocTypes.includes(file.type)) {
            toast.error(`Arquivo "${file.name}" não é um documento suportado.`);
            continue;
          }
          if (file.size > MAX_DOC_SIZE) {
            toast.error(`Documento "${file.name}" excede o limite de 10MB.`);
            continue;
          }
        }

        let processedFile = file;
        if (type === 'image') {
          try {
            processedFile = await compressImage(file);
          } catch (err) {
            console.error("Erro na compressão:", err);
            // Fallback to original if compression fails
          }
        }

        const fileExt = file.name.split('.').pop();
        const fileName = `${profile.id}-${type}-${Date.now()}-${i}.${fileExt}`;
        const filePath = `${type}s/${fileName}`;

        const uploadWithRetry = async (retries = 2): Promise<any> => {
          try {
            const { error: uploadError } = await supabase.storage
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

        const { data: { publicUrl } } = supabase.storage
          .from('media')
          .getPublicUrl(filePath);

        const item = { 
          name: file.name, 
          url: publicUrl, 
          type, 
          size: `${(file.size / (1024 * 1024)).toFixed(2)} MB`,
          created_at: new Date().toISOString()
        };

        if (type === 'document') {
          newDocs.push(item);
        } else {
          newMedia.push(item);
        }
      }

      const updatedPortfolio = [...(profile.portfolio_media || []), ...newMedia];
      const updatedDocs = [...(profile.documents || []), ...newDocs];
      
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ 
          portfolio_media: updatedPortfolio, 
          documents: updatedDocs 
        })
        .eq('id', profile.id);

      if (updateError) throw updateError;

      setProfile({ 
        ...profile, 
        portfolio_media: updatedPortfolio, 
        documents: updatedDocs 
      });
      
      toast.success(`${newMedia.length + newDocs.length} arquivo(s) salvos com sucesso!`);
    } catch (error: any) {
      toast.error("Erro ao salvar arquivos: " + error.message);
    } finally {
      setSaving(false);
    }
  };


  const handleAddNewBrand = async () => {
    if (!newBrand.trim()) return;
    const { error } = await supabase.from('brand_flags').insert({ name: newBrand.trim() });
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
        const { error } = await supabase
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
      const { data: fresh, error: refetchErr } = await supabase
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
                <div className="w-full h-full bg-white/5 flex items-center justify-center text-4xl font-black">{profile?.full_name?.charAt(0)}</div>
              )}
            </div>
            <label className="absolute bottom-2 right-2 cursor-pointer bg-primary text-black p-2 rounded-lg shadow-lg hover:scale-110 transition-all">
              <Camera className="w-4 h-4" />
              <input type="file" className="hidden" accept="image/*" onChange={(e) => handleFileUpload(e, 'avatar')} />
            </label>
          </div>

          <div className="flex-1 pb-4">
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-4xl font-black text-white tracking-tighter">{profile?.full_name || 'Usuário'}</h1>
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
                    mask="phone"
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



              {/* CAMPOS ESPECÍFICOS: LOJISTA */}
              {profile?.role === 'lojista' && (
                <div className="pt-8 space-y-6">
                  <div className="flex items-center gap-3 border-b border-white/5 pb-4">
                    <Building className="w-6 h-6 text-primary" />
                    <h3 className="text-xl font-black uppercase tracking-tighter">Configuração de Bandeira</h3>
                  </div>
                  <div className="space-y-4">
                    <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1">Selecione a Bandeira / Fabricante</label>
                    <div className="flex flex-wrap gap-2">
                      {brands.map(brand => (
                        <button
                          key={brand}
                          onClick={() => setProfile({...profile, brand_flag: brand})}
                          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all border ${profile?.brand_flag === brand ? 'bg-primary text-black border-primary' : 'bg-white/5 border-white/10 hover:border-primary/50'}`}
                        >
                          {brand}
                        </button>
                      ))}
                      <button
                        onClick={() => setIsAddingBrand(true)}
                        className="px-4 py-2 rounded-xl text-xs font-bold bg-white/5 border border-dashed border-white/20 hover:border-primary text-muted-foreground hover:text-primary transition-all flex items-center gap-1"
                      >
                        <Plus className="w-3 h-3" />
                        Outra Bandeira
                      </button>
                    </div>

                    {isAddingBrand && (
                      <div className="flex gap-2 animate-in slide-in-from-top-2 duration-300">
                        <input 
                          autoFocus
                          value={newBrand}
                          onChange={e => setNewBrand(e.target.value)}
                          placeholder="Digite a nova bandeira..."
                          className="flex-1 bg-white/5 border border-white/10 p-3 rounded-xl text-sm outline-none focus:border-primary"
                        />
                        <button onClick={handleAddNewBrand} className="bg-primary text-black font-bold px-4 rounded-xl text-xs">Adicionar</button>
                        <button onClick={() => setIsAddingBrand(false)} className="bg-white/5 px-4 rounded-xl text-xs">Cancelar</button>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* CAMPOS ESPECÍFICOS: PRESTADOR */}
              {profile?.role === 'prestador' && (
                <div className="pt-8 space-y-6">

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
              />
            )}
            {/* CENTRAL DE MÍDIA COMPACTA - REFORMULADA */}
            <section className="bg-card/30 backdrop-blur-xl border border-white/10 p-6 rounded-[2rem] shadow-2xl space-y-6">
              <div className="flex items-center gap-3 border-b border-white/5 pb-4">
                <Upload className="w-5 h-5 text-primary" />
                <h3 className="text-lg font-black uppercase tracking-tighter">Mídia & Documentos</h3>
              </div>
              
              <div className="space-y-8">
                {/* DOCUMENTOS */}
                <div className="space-y-4">
                  <h4 className="text-[10px] font-black text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                    <FileText className="w-3 h-3" /> Documentos (PDF, DOC, XLS)
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {profile?.documents?.filter((f: any) => f.type === 'document').map((doc: any, i: number) => (
                      <div key={i} className="flex items-center justify-between p-3 bg-white/5 rounded-xl border border-white/5 group hover:border-primary/30 transition-all">
                        <div className="flex items-center gap-3 overflow-hidden">
                          <div className="w-8 h-8 bg-primary/20 rounded-lg flex items-center justify-center text-primary flex-shrink-0">
                            <File className="w-4 h-4" />
                          </div>
                          <div className="truncate">
                            <p className="text-[11px] font-bold text-white truncate">{doc.name}</p>
                            <p className="text-[9px] text-muted-foreground uppercase">{doc.size || 'N/A'}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <a href={doc.url} target="_blank" rel="noreferrer" className="text-muted-foreground hover:text-primary transition-colors">
                            <ExternalLink className="w-4 h-4" />
                          </a>
                          <button onClick={() => {
                            const next = profile.documents.filter((_: any, idx: number) => idx !== i);
                            setProfile({...profile, documents: next});
                          }} className="text-muted-foreground hover:text-red-500 transition-colors">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                    <label className="border-2 border-dashed border-white/10 rounded-xl p-4 flex flex-col items-center justify-center gap-2 hover:border-primary/50 transition-all cursor-pointer group">
                      <Plus className="w-4 h-4 text-muted-foreground group-hover:text-primary" />
                      <span className="text-[9px] font-black uppercase text-muted-foreground group-hover:text-primary">Novo Documento</span>
                      <input type="file" className="hidden" accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt" onChange={(e) => handleMediaUpload(e, 'document')} />
                    </label>
                  </div>
                </div>

                {/* IMAGENS / GALERIA PINTEREST */}
                <div className="space-y-4">
                  <h4 className="text-[10px] font-black text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                    <Camera className="w-3 h-3" /> Galeria de Imagens
                    <span className="ml-auto text-[9px] text-amber-400/90">💰 6 grátis · +5 moedas/foto extra</span>
                  </h4>
                  <div className="columns-2 gap-3 space-y-3">
                    {profile?.portfolio_media?.filter((f: any) => f.type === 'image').map((img: any, i: number) => (
                      <div key={i} className="relative group rounded-xl overflow-hidden cursor-pointer break-inside-avoid shadow-lg" onClick={() => setLightbox({ isOpen: true, type: 'image', url: img.url, index: i })}>
                        <img src={img.url} alt="Portfolio" className="w-full object-cover transition-transform duration-500 group-hover:scale-110" />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                          <button onClick={(e) => { e.stopPropagation(); /* edit logic */ }} className="bg-white/10 p-2 rounded-full backdrop-blur-md hover:bg-primary hover:text-black"><Save className="w-4 h-4" /></button>
                          <button onClick={(e) => {
                            e.stopPropagation();
                            const next = profile.portfolio_media.filter((_: any, idx: number) => idx !== i);
                            setProfile({...profile, portfolio_media: next});
                          }} className="bg-white/10 p-2 rounded-full backdrop-blur-md hover:bg-red-500"><Trash2 className="w-4 h-4" /></button>
                        </div>
                      </div>
                    ))}
                    <label className="w-full aspect-square border-2 border-dashed border-white/10 rounded-xl flex flex-col items-center justify-center gap-2 hover:border-primary/50 transition-all cursor-pointer group break-inside-avoid">
                      <Plus className="w-6 h-6 text-muted-foreground group-hover:text-primary" />
                      <input type="file" className="hidden" accept="image/*" multiple onChange={(e) => handleMediaUpload(e, 'image')} />
                    </label>
                  </div>
                </div>

                {/* VÍDEOS */}
                <div className="space-y-4">
                  <h4 className="text-[10px] font-black text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                    <Play className="w-3 h-3" /> Vídeos & Demonstrações
                    <span className="ml-auto text-[9px] text-amber-400/90">💰 1 grátis · +10 moedas/vídeo extra</span>
                  </h4>
                  <div className="grid grid-cols-1 gap-4">
                    {profile?.portfolio_media?.filter((f: any) => f.type === 'video').map((vid: any, i: number) => (
                      <div key={i} className="relative group rounded-2xl overflow-hidden bg-black aspect-video border border-white/5">
                        <video src={vid.url} className="w-full h-full object-cover opacity-60 group-hover:opacity-100 transition-opacity" controls />
                        <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
                           <button onClick={() => {
                            const next = profile.portfolio_media.filter((_: any, idx: number) => idx !== i);
                            setProfile({...profile, portfolio_media: next});
                          }} className="bg-black/60 p-2 rounded-xl backdrop-blur-md hover:bg-red-500"><Trash2 className="w-4 h-4" /></button>
                        </div>
                      </div>
                    ))}
                    <label className="border-2 border-dashed border-white/10 rounded-2xl p-8 flex flex-col items-center justify-center gap-3 hover:border-primary/50 transition-all cursor-pointer group">
                      <Play className="w-8 h-8 text-muted-foreground group-hover:text-primary" />
                      <span className="text-xs font-bold uppercase text-muted-foreground group-hover:text-primary">Upload de Vídeo</span>
                      <input type="file" className="hidden" accept="video/*" onChange={(e) => handleMediaUpload(e, 'video')} />
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
    </div>
  );
}


