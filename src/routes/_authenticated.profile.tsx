import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Camera, MapPin, Save, User, Briefcase, Building } from "lucide-react";

export const Route = createFileRoute("/_authenticated/profile")({
  component: ProfilePage,
});

function ProfilePage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<any>(null);

  useEffect(() => {
    async function loadProfile() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
      
      if (data) setProfile(data);
      setLoading(false);
    }
    loadProfile();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    
    const { error } = await supabase
      .from('profiles')
      .update(profile)
      .eq('id', user!.id);
      
    if (error) {
      toast.error("Erro ao salvar perfil");
    } else {
      toast.success("Perfil atualizado!");
    }
    setSaving(false);
  };

  if (loading) return <div className="flex items-center justify-center h-full"><Loader2 className="animate-spin text-primary" /></div>;

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-extrabold text-white">Meu Perfil</h1>
          <p className="text-muted-foreground">Gerencie suas informações profissionais</p>
        </div>
        <button 
          onClick={handleSave}
          disabled={saving}
          className="bg-primary text-black font-bold px-6 py-2 rounded-lg flex items-center gap-2 hover:opacity-90 transition-all"
        >
          {saving ? <Loader2 className="animate-spin w-4 h-4" /> : <Save className="w-4 h-4" />}
          Salvar Alterações
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-1 bg-card/50 border border-white/10 p-6 rounded-2xl backdrop-blur-md">
            <div className="flex flex-col items-center text-center">
                <div className="w-24 h-24 bg-white/10 rounded-full mb-4 flex items-center justify-center text-3xl font-bold">
                    {profile?.full_name?.charAt(0) || <User />}
                </div>
                <h2 className="font-bold text-lg">{profile?.full_name}</h2>
                <span className="text-primary text-sm font-bold uppercase">{profile?.role}</span>
            </div>
        </div>

        <div className="md:col-span-2 bg-card/50 border border-white/10 p-6 rounded-2xl backdrop-blur-md space-y-6">
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="text-xs font-bold text-muted-foreground uppercase">Nome Completo</label>
                    <input 
                        value={profile?.full_name || ''} 
                        onChange={(e) => setProfile({...profile, full_name: e.target.value})}
                        className="w-full mt-1 bg-background/50 border border-white/10 p-3 rounded-lg text-sm"
                    />
                </div>
                <div>
                    <label className="text-xs font-bold text-muted-foreground uppercase">Telefone</label>
                    <input 
                        value={profile?.phone || ''} 
                        onChange={(e) => setProfile({...profile, phone: e.target.value})}
                        className="w-full mt-1 bg-background/50 border border-white/10 p-3 rounded-lg text-sm"
                    />
                </div>
            </div>
            
            {/* Dynamic fields based on role would go here */}
            {profile?.role === 'lojista' && (
                <div className="pt-4 border-t border-white/10">
                    <label className="text-xs font-bold text-muted-foreground uppercase">Bandeira da Loja</label>
                    <input 
                        value={profile?.brand_flag || ''} 
                        onChange={(e) => setProfile({...profile, brand_flag: e.target.value})}
                        className="w-full mt-1 bg-background/50 border border-white/10 p-3 rounded-lg text-sm"
                    />
                </div>
            )}
        </div>
      </div>
    </div>
  );
}
