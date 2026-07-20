import { createFileRoute, Link } from "@tanstack/react-router";
import { usePerformanceMode } from "@/hooks/use-performance-mode";
import { 
  Users, 
  ShieldCheck, 
  Activity,
  AlertTriangle,
  ArrowUpRight,
  Mail,
  Plus,
  LayoutGrid,
  Settings,
  ShieldAlert,
  Hammer,
  Store,
  Truck
} from "lucide-react";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/")({
  component: AdminDashboard,
});

function AdminDashboard() {
  const { glassClass } = usePerformanceMode();
  const [authorizedEmails, setAuthorizedEmails] = useState<{id: string, email: string}[]>([]);
  const [newEmail, setNewEmail] = useState("");
  const [loading, setLoading] = useState(true);

  const fetchAdmins = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('admin_config')
        .select('id, email')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAuthorizedEmails(data || []);
    } catch (error: any) {
      console.error("Erro ao buscar admins:", error.message);
      toast.error("Falha ao carregar lista de administradores");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdmins();
  }, []);

  const addAdminEmail = async () => {
    if (!newEmail || !newEmail.includes("@")) {
      toast.error("Email inválido");
      return;
    }
    
    try {
      const { error } = await supabase
        .from('admin_config')
        .insert([{ email: newEmail }]);

      if (error) {
        if (error.code === '23505') throw new Error("Email já está na lista");
        throw error;
      }

      toast.success(`Email ${newEmail} autorizado!`);
      setNewEmail("");
      fetchAdmins();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const removeAdminEmail = async (id: string, email: string) => {
    if (email === "jorgericardosalgado@gmail.com") {
      toast.error("Não é possível remover o administrador master");
      return;
    }

    try {
      const { error } = await supabase
        .from('admin_config')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      toast.info("Email removido");
      fetchAdmins();
    } catch (error: any) {
      toast.error("Erro ao remover: " + error.message);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-black text-white tracking-tight">Painel Administrativo</h1>
          <p className="text-muted-foreground mt-2">Gestão central do ecossistema FIXXER.</p>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20">
          <ShieldCheck className="w-4 h-4 text-primary" />
          <span className="text-[10px] font-bold uppercase tracking-widest text-primary">Acesso Master Ativo</span>
        </div>
      </header>

      {/* Atalhos Rápidos */}
      <section>
        <h2 className="text-sm font-bold uppercase tracking-[0.2em] text-muted-foreground mb-4">Atalhos do Sistema</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          <ShortcutButton icon={<LayoutGrid />} label="Dashboard" to="/dashboard" />
          <ShortcutButton icon={<Store />} label="Lojistas" to="/dashboard" />
          <ShortcutButton icon={<Hammer />} label="Prestadores" to="/dashboard" />
          <ShortcutButton icon={<Truck />} label="Fornecedores" to="/dashboard" />
          <ShortcutButton icon={<Settings />} label="Config" to="/admin" />
          <ShortcutButton icon={<ShieldAlert />} label="Logs" to="/admin" />
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Estatísticas */}
        <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6">
          <AdminStatCard 
            icon={<Users className="text-primary" />} 
            label="Total Usuários" 
            value="1,284" 
            change="+12% este mês"
            glassClass={glassClass} 
          />
          <AdminStatCard 
            icon={<ShieldCheck className="text-primary" />} 
            label="Sessões Ativas" 
            value="42" 
            change="Estável"
            glassClass={glassClass} 
          />
          
          <div className={`md:col-span-2 p-8 rounded-3xl ${glassClass} border border-white/5`}>
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-xl font-bold flex items-center gap-3">
                <Activity className="w-5 h-5 text-primary" />
                Atividade Recente
              </h2>
            </div>
            
            <div className="space-y-4">
              {[
                { user: "Jorge Ricardo", action: "Login Administrador", time: "Agora" },
                { user: "Marcenaria Silva", action: "Upload de Projeto", time: "15 min atrás" },
                { user: "Pedro Montador", action: "OS Finalizada", time: "1 hora atrás" }
              ].map((log, i) => (
                <div key={i} className="flex items-center justify-between p-4 rounded-2xl bg-white/5 border border-white/5 hover:bg-white/10 transition-colors group">
                  <div className="flex items-center gap-4">
                    <div className="w-2 h-2 rounded-full bg-primary shadow-[0_0_8px_rgba(0,255,135,0.6)]" />
                    <div>
                      <p className="font-bold text-sm text-white">{log.user}</p>
                      <p className="text-xs text-muted-foreground">{log.action}</p>
                    </div>
                  </div>
                  <span className="text-[10px] font-medium text-muted-foreground/60 uppercase">{log.time}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Gestão de Administradores */}
        <div className={`p-8 rounded-3xl ${glassClass} border border-white/5 flex flex-col`}>
          <div className="flex items-center gap-3 mb-6">
            <Mail className="w-5 h-5 text-primary" />
            <h2 className="text-xl font-bold">Emails Autorizados</h2>
          </div>
          
          <div className="flex gap-2 mb-6">
            <input 
              type="email" 
              placeholder="novo-admin@email.com"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              className="flex-1 bg-background border border-white/10 rounded-xl px-4 py-2 text-sm focus:border-primary outline-none transition-all"
            />
            <button 
              onClick={addAdminEmail}
              className="bg-primary text-primary-foreground p-2 rounded-xl hover:opacity-90 active:scale-95 transition-all"
            >
              <Plus className="w-5 h-5" />
            </button>
          </div>

          <div className="flex-1 space-y-3 overflow-auto max-h-[400px] pr-2 custom-scrollbar">
            {loading ? (
              <div className="flex justify-center p-8">
                <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              </div>
            ) : authorizedEmails.map((item) => (
              <div key={item.id} className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/5 group hover:border-primary/30 transition-all">
                <span className="text-sm font-medium text-muted-foreground truncate mr-2">{item.email}</span>
                {item.email !== "jorgericardosalgado@gmail.com" && (
                  <button 
                    onClick={() => removeAdminEmail(item.id, item.email)}
                    className="text-xs text-red-400/50 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all"
                  >
                    Remover
                  </button>
                )}
                {item.email === "jorgericardosalgado@gmail.com" && (
                  <span className="text-[8px] font-black uppercase text-primary/50">Master</span>
                )}
              </div>
            ))}
          </div>

          <div className="mt-6 pt-6 border-t border-white/5 text-[10px] text-muted-foreground/60 leading-relaxed italic">
            * Usuários registrados com estes emails receberão automaticamente o perfil de Admin.
          </div>
        </div>
      </div>
    </div>
  );
}

function ShortcutButton({ icon, label, to }: { icon: any, label: string, to: string }) {
  return (
    <Link 
      to={to as any}
      className="flex flex-col items-center justify-center p-4 rounded-2xl bg-white/5 border border-white/5 hover:border-primary/40 hover:bg-primary/5 transition-all group active:scale-95"
    >
      <div className="text-muted-foreground group-hover:text-primary transition-colors mb-2">
        {icon}
      </div>
      <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground group-hover:text-white transition-colors">{label}</span>
    </Link>
  );
}

function AdminStatCard({ icon, label, value, change, glassClass }: any) {
  return (
    <div className={`p-6 rounded-3xl ${glassClass} border border-white/5 hover:border-primary/20 transition-all group relative overflow-hidden`}>
      <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
        <ArrowUpRight className="w-12 h-12" />
      </div>
      <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform relative z-10">
        {icon}
      </div>
      <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-1 relative z-10">{label}</p>
      <h3 className="text-3xl font-black text-white relative z-10">{value}</h3>
      <p className="text-[10px] font-bold text-primary mt-2 relative z-10">{change}</p>
    </div>
  );
}