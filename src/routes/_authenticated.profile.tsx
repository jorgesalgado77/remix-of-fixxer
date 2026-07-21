import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Camera, MapPin, Save, User, Star, BadgeCheck, Upload, Trash2, Plus, Search } from "lucide-react";
import { compressImage } from "@/utils/image-compression";

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

  useEffect(() => {
    async function loadData() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const [profileRes, brandsRes] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', user.id).single(),
        supabase.from('brand_flags').select('name').order('name', { ascending: true })
      ]);
      
      if (profileRes.data) setProfile(profileRes.data);
      if (brandsRes.data) setBrands(brandsRes.data.map(b => b.name));
      setLoading(false);
    }
    loadData();
  }, []);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'avatar' | 'banner') => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const compressed = await compressImage(file);
      const fileExt = file.name.split('.').pop();
      const fileName = `${profile.id}-${type}-${Math.random()}.${fileExt}`;
      const filePath = `profiles/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('media')
        .upload(filePath, compressed);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('media')
        .getPublicUrl(filePath);

      setProfile({ ...profile, [type === 'avatar' ? 'avatar_url' : 'banner_url']: publicUrl });
      toast.success("Mídia atualizada!");
    } catch (error: any) {
      toast.error("Erro no upload: " + error.message);
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

  if (loading) return (
    <div className="flex flex-col items-center justify-center h-[80vh] gap-4">
      <Loader2 className="animate-spin text-primary w-12 h-12" />
      <p className="text-muted-foreground font-bold uppercase tracking-tighter animate-pulse">Carregando Perfil...</p>
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
                  <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1">Nome / Razão Social</label>
                  <input 
                    value={profile?.full_name || ''} 
                    onChange={e => setProfile({...profile, full_name: e.target.value})}
                    className="w-full bg-white/5 border border-white/10 focus:border-primary/50 focus:ring-1 focus:ring-primary/20 p-4 rounded-2xl transition-all outline-none"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1">CNPJ / CPF</label>
                  <input 
                    value={profile?.cnpj_cpf || ''} 
                    onChange={e => setProfile({...profile, cnpj_cpf: e.target.value})}
                    className="w-full bg-white/5 border border-white/10 focus:border-primary/50 focus:ring-1 focus:ring-primary/20 p-4 rounded-2xl transition-all outline-none font-mono"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1">WhatsApp</label>
                  <input 
                    value={profile?.whatsapp || ''} 
                    onChange={e => setProfile({...profile, whatsapp: e.target.value})}
                    className="w-full bg-white/5 border border-white/10 focus:border-primary/50 focus:ring-1 focus:ring-primary/20 p-4 rounded-2xl transition-all outline-none font-mono"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1">Telefone</label>
                  <input 
                    value={profile?.phone || ''} 
                    onChange={e => setProfile({...profile, phone: e.target.value})}
                    className="w-full bg-white/5 border border-white/10 focus:border-primary/50 focus:ring-1 focus:ring-primary/20 p-4 rounded-2xl transition-all outline-none font-mono"
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
                      onChange={e => setProfile({...profile, cep: e.target.value})}
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
                        <input type="checkbox" className="w-5 h-5 accent-primary bg-black border-white/20 rounded-md" />
                        <span className="text-xs font-bold">{svc}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </section>
          </div>

          <div className="space-y-8">
            {/* CENTRAL DE MÍDIA COMPACTA */}
            <section className="bg-card/30 backdrop-blur-xl border border-white/10 p-6 rounded-[2rem] shadow-2xl space-y-6">
              <div className="flex items-center gap-3 border-b border-white/5 pb-4">
                <Upload className="w-5 h-5 text-primary" />
                <h3 className="text-lg font-black uppercase tracking-tighter">Mídia & Documentos</h3>
              </div>
              
              <div className="space-y-4">
                <div className="border-2 border-dashed border-white/10 rounded-2xl p-8 flex flex-col items-center justify-center gap-3 hover:border-primary/50 transition-all group cursor-pointer">
                  <Upload className="w-8 h-8 text-muted-foreground group-hover:text-primary group-hover:scale-110 transition-all" />
                  <div className="text-center">
                    <p className="text-xs font-bold text-white">Upload de Arquivos</p>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-widest mt-1">PDF, Excel, Imagens</p>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-white/5 rounded-xl border border-white/5">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-primary/20 rounded-lg flex items-center justify-center text-primary font-bold text-[10px]">PDF</div>
                      <div>
                        <p className="text-[11px] font-bold text-white leading-tight">Catalogo_2024.pdf</p>
                        <p className="text-[9px] text-muted-foreground uppercase">2.4 MB</p>
                      </div>
                    </div>
                    <button className="text-muted-foreground hover:text-red-500 transition-colors"><Trash2 className="w-4 h-4" /></button>
                  </div>
                </div>
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}

