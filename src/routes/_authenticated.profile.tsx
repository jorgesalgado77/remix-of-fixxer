import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Camera, MapPin, Save, User, Star, BadgeCheck, Upload, Trash2, Plus, Search, Building, Briefcase, FileText, File, FileSpreadsheet, Play, X, ChevronLeft, ChevronRight, MessageSquare, ExternalLink } from "lucide-react";
import { compressImage } from "@/utils/image-compression";
import { MaskedInput } from "@/components/MaskedInput";


export const Route = createFileRoute("/_authenticated/profile")({
  component: ProfilePage,
});

function ProfilePage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<any>(null);
  const [brands, setBrands] = useState<string[]>([]);
  const [newBrand, setNewBrand] = useState("");
  const [isAddingBrand, setIsAddingBrand] = useState(false);
  const [lightbox, setLightbox] = useState<{ isOpen: boolean; type: string; url: string; index: number }>({ isOpen: false, type: '', url: '', index: 0 });


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
      
      if (profileRes.data) setProfile(profileRes.data);
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

      const fileExt = (file.name.split('.').pop() || 'jpg').toLowerCase();
      const filePath = `profiles/${profile.id}/${type}-${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('media')
        .upload(filePath, processed, { upsert: true, cacheControl: '3600', contentType: processed.type || 'image/jpeg' });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage.from('media').getPublicUrl(filePath);

      const field = type === 'avatar' ? 'avatar_url' : 'banner_url';
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ [field]: publicUrl })
        .eq('id', profile.id);
      if (updateError) throw updateError;

      setProfile({ ...profile, [field]: publicUrl });
      toast.success("Mídia atualizada!", { id: toastId });
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

    const allowedImageTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
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

  const handleSave = async () => {
    setSaving(true);
    const { error } = await supabase
      .from('profiles')
      .update(profile)
      .eq('id', profile.id);
      
    if (error) {
      toast.error("Erro ao salvar perfil");
    } else {
      toast.success("Perfil atualizado com sucesso!");
    }
    setSaving(false);
  };

  const handleCepLookup = async (cep: string) => {
    const cleanCep = cep.replace(/\D/g, '');
    if (cleanCep.length !== 8) return;

    try {
      const response = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
      const data = await response.json();
      if (!data.erro) {
        setProfile({
          ...profile,
          cep: cleanCep,
          street: data.logradouro,
          neighborhood: data.bairro,
          city: data.localidade,
          state: data.uf
        });
        toast.success("Endereço preenchido via CEP!");
      }
    } catch (e) {
      console.error("Erro CEP:", e);
    }
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center h-[80vh] gap-4 bg-[#121214]">
      <Loader2 className="animate-spin text-primary w-12 h-12" />
      <p className="text-muted-foreground font-black uppercase tracking-widest text-[10px] animate-pulse">Sincronizando Perfil...</p>
    </div>
  );


  return (
    <div className="min-h-screen bg-[#121214] pb-20 overflow-x-hidden">
      {/* 1. CABEÇALHO DO PERFIL */}
      <div className="relative h-64 w-full group">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-[#121214]/80 z-10" />
        {profile?.banner_url ? (
          <img src={profile.banner_url} className="w-full h-full object-cover" alt="Banner" />
        ) : (
          <div className="w-full h-full bg-white/5 border-b border-white/10" />
        )}
        <label className="absolute right-6 bottom-6 z-20 cursor-pointer bg-black/60 hover:bg-primary hover:text-black p-3 rounded-xl backdrop-blur-md border border-white/10 transition-all active:scale-95">
          <Camera className="w-5 h-5" />
          <input type="file" className="hidden" accept="image/*" onChange={(e) => handleFileUpload(e, 'banner')} />
        </label>
      </div>

      <div className="max-w-5xl mx-auto px-6 -mt-20 relative z-30">
        <div className="flex flex-col md:flex-row items-end gap-6 mb-12">
          <div className="relative group">
            <div className="w-40 h-40 rounded-3xl overflow-hidden border-4 border-[#121214] bg-[#121214] shadow-2xl">
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
            <div className="flex flex-wrap gap-2">
              <span className="bg-white/5 border border-white/10 text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-md text-muted-foreground">
                {profile?.role}
              </span>
              <span className="bg-primary/20 border border-primary/40 text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-md text-primary flex items-center gap-1">
                <BadgeCheck className="w-3 h-3" />
                Plano {profile?.plan_id ? 'Profissional' : 'Gratuito'}
              </span>
            </div>
          </div>

          <button 
            onClick={handleSave}
            disabled={saving}
            className="mb-4 bg-primary text-black font-black px-8 py-4 rounded-2xl shadow-[0_0_20px_rgba(0,255,135,0.3)] hover:shadow-[0_0_30px_rgba(0,255,135,0.5)] transition-all active:scale-95 disabled:opacity-50 flex items-center gap-2 uppercase tracking-tighter"
          >
            {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
            Salvar Perfil
          </button>
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
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1">Razão Social</label>
                  <input 
                    value={profile?.company_name || ''} 
                    onChange={e => setProfile({...profile, company_name: e.target.value})}
                    className="w-full bg-white/5 border border-white/10 focus:border-primary/50 focus:ring-1 focus:ring-primary/20 p-4 rounded-2xl transition-all outline-none"
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
                    <input 
                      value={profile?.cep || ''} 
                      onChange={e => {
                        const val = e.target.value;
                        setProfile({...profile, cep: val});
                        if (val.replace(/\D/g, '').length === 8) handleCepLookup(val);
                      }}
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
                  <div className="flex items-center gap-3 border-b border-white/5 pb-4">
                    <Briefcase className="w-6 h-6 text-primary" />
                    <h3 className="text-xl font-black uppercase tracking-tighter">Serviços & Especialidades</h3>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {['Projetista', 'Medidor', 'Conferente Técnico', 'Fretista', 'Montador', 'Supervisor'].map(svc => (
                      <label key={svc} className="flex items-center gap-3 bg-white/5 p-4 rounded-2xl border border-white/10 cursor-pointer hover:border-primary/30 transition-all">
                        <input
                          type="checkbox"
                          checked={profile?.service_types?.includes(svc) || false}
                          onChange={(e) => {
                            const current = profile?.service_types || [];
                            const next = e.target.checked
                              ? [...current, svc]
                              : current.filter((s: string) => s !== svc);
                            setProfile({ ...profile, service_types: next });
                          }}
                          className="w-5 h-5 accent-primary bg-black border-white/20 rounded-md"
                        />
                        <span className="text-xs font-bold">{svc}</span>
                      </label>
                    ))}
                  </div>

                  {/* CAIXA DE ACÚMULO DE FUNÇÕES - MOSTRA TODAS AS SELECIONADAS */}
                  <div className="p-4 bg-primary/5 border border-primary/20 rounded-2xl">
                    <label className="text-[10px] font-black text-primary uppercase tracking-widest ml-1 mb-3 block">
                      Acúmulo de Funções ({profile?.service_types?.length || 0})
                    </label>
                    <div className="flex flex-wrap gap-2 min-h-[40px]">
                      {(profile?.service_types || []).length === 0 ? (
                        <span className="text-xs text-muted-foreground italic">Selecione as funções acima para acumular.</span>
                      ) : (
                        (profile?.service_types || []).map((svc: string) => (
                          <span key={svc} className="bg-primary text-black text-[11px] font-black uppercase tracking-tight px-3 py-1.5 rounded-lg flex items-center gap-2">
                            <BadgeCheck className="w-3 h-3" />
                            {svc}
                          </span>
                        ))
                      )}
                    </div>
                  </div>

                  {/* VEÍCULO PRÓPRIO */}
                  <div className="pt-6 space-y-4 border-t border-white/5">
                    <h4 className="text-sm font-black uppercase tracking-tighter text-white">🚚 Veículo Próprio</h4>

                    <label className="flex items-center gap-3 bg-white/5 p-4 rounded-2xl border border-white/10 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={profile?.has_vehicle || false}
                        onChange={e => setProfile({ ...profile, has_vehicle: e.target.checked })}
                        className="w-5 h-5 accent-primary"
                      />
                      <span className="text-xs font-bold">Possuo veículo próprio</span>
                    </label>

                    {profile?.has_vehicle && (
                      <div className="space-y-4 pl-2 border-l-2 border-primary/30">
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1">Tipo de Veículo</label>
                          <div className="flex flex-wrap gap-2">
                            {['Carro', 'Moto', 'Van', 'Caminhonete', 'Caminhão'].map(v => (
                              <button
                                key={v}
                                type="button"
                                onClick={() => setProfile({ ...profile, vehicle_type: v })}
                                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all border ${profile?.vehicle_type === v ? 'bg-primary text-black border-primary' : 'bg-white/5 border-white/10 hover:border-primary/50'}`}
                              >
                                {v}
                              </button>
                            ))}
                          </div>
                        </div>

                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1">Descrição do Veículo (marca, modelo, ano, capacidade)</label>
                          <textarea
                            value={profile?.vehicle_description || ''}
                            onChange={e => setProfile({ ...profile, vehicle_description: e.target.value })}
                            rows={2}
                            className="w-full bg-white/5 border border-white/10 focus:border-primary/50 p-4 rounded-2xl outline-none text-sm"
                          />
                        </div>

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
              {/* CAMPOS ESPECÍFICOS: FORNECEDOR */}
              {profile?.role === 'fornecedor' && (
                <div className="pt-8 space-y-6">
                  <div className="flex items-center gap-3 border-b border-white/5 pb-4">
                    <Briefcase className="w-6 h-6 text-primary" />
                    <h3 className="text-xl font-black uppercase tracking-tighter">Ramo de Atuação</h3>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {['Marmoraria', 'Vidraçaria', 'Eletricista', 'Serralheria', 'Pintor', 'Gesseiro', 'Automação', 'Loja de Ferragens'].map(ramo => (
                      <label key={ramo} className="flex items-center gap-3 bg-white/5 p-4 rounded-2xl border border-white/10 cursor-pointer hover:border-primary/30 transition-all">
                        <input 
                          type="checkbox" 
                          checked={profile?.business_category?.includes(ramo)}
                          onChange={(e) => {
                            const current = profile?.business_category?.split(',') || [];
                            const next = e.target.checked 
                              ? [...current.filter(Boolean), ramo]
                              : current.filter((s: string) => s !== ramo);
                            setProfile({...profile, business_category: next.join(',')});
                          }}
                          className="w-5 h-5 accent-primary bg-black border-white/20 rounded-md" 
                        />
                        <span className="text-xs font-bold">{ramo}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </section>
          </div>

          <div className="space-y-8">
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


