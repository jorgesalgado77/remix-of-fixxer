import { createFileRoute, Link } from "@tanstack/react-router";
import { usePerformanceMode } from "@/hooks/use-performance-mode";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { 
  LayoutDashboard, 
  Users, 
  Settings, 
  MessageSquare, 
  TrendingUp,
  Package,
  Clock,
  Plus,
  ArrowRight,
  MapPin,
  Eye,
  Megaphone,
  CreditCard,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  RefreshCcw,
  Star,
  Search,
  FileText,
  User,
  Upload,
  Camera,
  Map,
  DollarSign,
  ChevronRight,
  Filter
} from "lucide-react";
import { useState, useEffect, useMemo } from "react";
import { toast } from "sonner";



export const Route = createFileRoute("/_authenticated/dashboard")({
  component: Dashboard,
});

function Dashboard() {
  const { glassClass } = usePerformanceMode();
  const { session, userRole } = Route.useRouteContext();
  
  const { data: profile } = useQuery({
    queryKey: ['profile', session?.user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('profiles')
        .select('*, subscription_plans(*)')
        .eq('id', session?.user?.id)
        .single();
      return data;
    },
    enabled: !!session?.user?.id
  });

  const isFreePlan = profile?.subscription_plans?.price === 0 || !profile?.subscription_plans;

  const handlePaywallAction = (e: React.MouseEvent, action: string) => {
    if (isFreePlan) {
      e.preventDefault();
      toast.error("Ação Bloqueada", {
        description: `O plano 'Teste Gratuito' não permite ${action}. Faça upgrade para o Plano Profissional.`,
        action: {
          label: "Upgrade",
          onClick: () => console.log("Upgrade clicked")
        }
      });
      return false;
    }
    return true;
  };


  return (
    <div className="p-4 md:p-8 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 max-w-7xl mx-auto">
      {/* Dynamic Header */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="relative group">
            <div className="absolute -inset-1 bg-primary/20 rounded-full blur group-hover:bg-primary/40 transition-all duration-500"></div>
            <div className="relative w-16 h-16 md:w-20 md:h-20 rounded-full border-2 border-primary/30 bg-secondary flex items-center justify-center overflow-hidden">
              {profile?.avatar_url ? (
                <img src={profile.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                <span className="text-2xl font-black text-primary">{profile?.full_name?.[0] || 'U'}</span>
              )}
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1">
               <h1 className="text-2xl md:text-3xl font-black tracking-tighter text-white uppercase italic">
                {profile?.company_name || profile?.full_name || 'Comando Fixxer'}
              </h1>
              {profile?.brand_flag && (
                <span className="px-2 py-0.5 rounded-md bg-white/5 border border-white/10 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                  {profile.brand_flag}
                </span>
              )}
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1 text-primary">
                <span className="text-sm font-black">{profile?.karma_score?.toFixed(1) || '5.0'}</span>
                <div className="flex">
                  {[1,2,3,4,5].map(i => (
                    <div key={i} className={`w-2 h-2 rounded-full mx-0.5 ${i <= (profile?.karma_score || 5) ? 'bg-primary' : 'bg-white/10'}`}></div>
                  ))}
                </div>
              </div>
              <div className="h-3 w-[1px] bg-white/10"></div>
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">
                {userRole === 'lojista' ? 'Módulo Gestão' : userRole === 'prestador' ? 'Módulo Operacional' : 'Módulo Parceiro'}
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
           <Link 
            to="/profile"
            className={`flex items-center gap-3 p-3 rounded-2xl border border-white/10 hover:border-primary/50 transition-all ${glassClass} group`}
          >
            <Settings className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
            <div className="text-left pr-2">
              <p className="text-[10px] font-black uppercase tracking-tighter text-white">Minha Conta</p>
              <p className="text-[8px] font-bold text-muted-foreground uppercase tracking-widest">Configurações</p>
            </div>
          </Link>
          {isFreePlan && (
             <button className="bg-primary hover:bg-primary-dark text-black font-black text-[10px] uppercase tracking-tighter px-4 py-3 rounded-xl shadow-[0_0_20px_rgba(0,255,135,0.3)] hover:scale-105 active:scale-95 transition-all">
               Fazer Upgrade
             </button>
          )}
        </div>
      </header>

      {/* Render Categorized Dashboard */}
      {userRole === 'lojista' && <LojistaDashboard glassClass={glassClass} isFreePlan={isFreePlan} onAction={handlePaywallAction} profile={profile} />}
      {userRole === 'prestador' && <PrestadorDashboard glassClass={glassClass} isFreePlan={isFreePlan} onAction={handlePaywallAction} />}
      {userRole === 'fornecedor' && <FornecedorDashboard glassClass={glassClass} isFreePlan={isFreePlan} onAction={handlePaywallAction} />}

      {userRole === 'admin' && (
        <div className={`p-12 rounded-3xl border border-dashed border-white/10 flex flex-col items-center justify-center text-center ${glassClass}`}>
          <LayoutDashboard className="w-12 h-12 text-primary mb-4 opacity-20" />
          <h2 className="text-xl font-black text-white uppercase italic">Dashboard Admin</h2>
          <p className="text-muted-foreground text-sm max-w-xs mb-6">Use o menu superior para acessar as ferramentas de gestão do sistema.</p>
          <Link to="/admin" className="px-6 py-2 bg-white/5 border border-white/10 rounded-xl text-xs font-bold hover:bg-white/10 transition-all">Ir para Painel Admin</Link>
        </div>
      )}

    </div>
  );
}

// --- LOJISTA DASHBOARD ---
function LojistaDashboard({ glassClass, isFreePlan, onAction, profile }: { glassClass: string, isFreePlan: boolean, onAction: (e: any, action: string) => boolean, profile: any }) {
  const [activeTab, setActiveTab] = useState<'overview' | 'marketplace' | 'os' | 'profile'>('overview');
  const [osFilter, setOsFilter] = useState<'sent' | 'executing' | 'finished'>('sent');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const categories = [
    "Projetos & Modulação",
    "Conferência Técnica",
    "Montagem Especializada",
    "Supervisão e Vistoria",
    "Frete & Entregas",
    "Peças & Fornecedores",
    "Marmoraria & Pedras",
    "Gesso & Drywall",
    "Pintura & Alvenaria",
    "Iluminação & Elétrica",
    "Decoração"
  ];

  return (
    <div className="flex flex-col min-h-[60vh] pb-20 md:pb-0">
      <div className="flex-1 space-y-6">
        {activeTab === 'overview' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <StatCard icon={<Package className="text-primary" />} label="O.S. Ativas" value="12" glassClass={glassClass} />
              <StatCard icon={<RefreshCcw className="text-primary" />} label="Aguardando Aceite" value="08" glassClass={glassClass} />
              <StatCard icon={<CheckCircle2 className="text-primary" />} label="Finalizados" value="48" glassClass={glassClass} />
              <StatCard icon={<Star className="text-amber-500" />} label="Reputação" value={profile?.karma_score?.toFixed(1) || "5.0"} glassClass={glassClass} color="amber" />
            </div>

            <div className="relative group overflow-hidden rounded-3xl">
              <button 
                onClick={(e) => onAction(e, "criar nova O.S.")}
                className="w-full p-6 md:p-10 border-2 border-primary/30 border-dashed rounded-3xl flex flex-col items-center justify-center gap-2 hover:border-primary hover:bg-primary/5 transition-all group"
              >
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                  <Plus className="w-6 h-6" />
                </div>
                <div className="text-center">
                  <h3 className="text-lg font-black text-white uppercase italic">Nova Proposta / O.S.</h3>
                  <p className="text-[10px] text-muted-foreground font-bold tracking-widest uppercase">Iniciar contratação imediata</p>
                </div>
              </button>
            </div>

            <div className={`p-6 rounded-3xl ${glassClass}`}>
              <h2 className="text-sm font-black text-white uppercase italic flex items-center gap-2 mb-4">
                <Clock className="w-4 h-4 text-primary" />
                Notificações Recentes
              </h2>
              <div className="space-y-3">
                {[1, 2].map(i => (
                  <div key={i} className="p-3 rounded-xl bg-white/5 border border-white/5 flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <MessageSquare className="w-4 h-4 text-primary" />
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-white uppercase italic">Novo Comentário na O.S. #2839</p>
                      <p className="text-[9px] text-muted-foreground font-medium mt-0.5 line-clamp-1">"O projeto já foi verificado e está pronto para montagem..."</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'marketplace' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-2 duration-300">
            <div className="flex flex-col gap-4">
              <h2 className="text-lg font-black text-white uppercase italic tracking-tight">Contratar Parceiros</h2>
              <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                {categories.map(cat => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(selectedCategory === cat ? null : cat)}
                    className={`px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-tighter whitespace-nowrap transition-all border ${selectedCategory === cat ? 'bg-primary text-black border-primary' : 'bg-white/5 text-muted-foreground border-white/10 hover:border-primary/50'}`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid gap-4">
              {[1, 2, 3].map(i => (
                <div key={i} className={`p-4 rounded-2xl ${glassClass} border border-white/10 flex items-center gap-4`}>
                  <div className="w-14 h-14 rounded-xl bg-secondary border border-white/10 overflow-hidden shrink-0">
                    <img src={`https://i.pravatar.cc/150?u=${i}`} alt="Prestador" className="w-full h-full object-cover opacity-80" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <h4 className="text-xs font-black text-white uppercase truncate italic">Carlos Montador Profissional</h4>
                      <div className="flex items-center gap-0.5 text-[10px] font-black text-primary">
                        <Star className="w-3 h-3 fill-primary" /> 4.9
                      </div>
                    </div>
                    <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest mt-0.5">Montagem Especializada • 1.2km</p>
                    <div className="mt-2 flex items-center gap-2">
                      <span className="px-1.5 py-0.5 rounded bg-primary/20 text-primary text-[8px] font-black uppercase tracking-tighter">Disponível Hoje</span>
                      <div className="flex gap-1 ml-auto">
                        <button className="px-2 py-1.5 rounded-lg bg-white/5 border border-white/10 text-[8px] font-black uppercase tracking-tighter hover:bg-white/10 transition-all">Perfil</button>
                        <button onClick={(e) => onAction(e, "enviar proposta")} className="px-3 py-1.5 rounded-lg bg-primary text-black text-[8px] font-black uppercase tracking-tighter hover:opacity-90 transition-all">Contratar</button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'os' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-2 duration-300">
            <div className="flex p-1 bg-white/5 rounded-2xl border border-white/5">
              {(['sent', 'executing', 'finished'] as const).map(f => (
                <button
                  key={f}
                  onClick={() => setOsFilter(f)}
                  className={`flex-1 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${osFilter === f ? 'bg-primary text-black' : 'text-muted-foreground hover:text-white'}`}
                >
                  {f === 'sent' ? 'Enviadas' : f === 'executing' ? 'Execução' : 'Finalizadas'}
                </button>
              ))}
            </div>

            <div className="space-y-4">
              {[1, 2].map(i => (
                <div key={i} className={`p-5 rounded-2xl ${glassClass} border border-white/10 space-y-4`}>
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <h4 className="text-xs font-black text-white uppercase italic">Apto {i}02 - Ed. Horizonte</h4>
                      <p className="text-[9px] font-bold text-muted-foreground uppercase mt-1">Cozinha & Dormitório</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-black text-primary">R$ 2.450,00</p>
                      <p className="text-[8px] font-bold text-muted-foreground uppercase mt-0.5 italic">Início: 25/07</p>
                    </div>
                  </div>
                  
                  {osFilter === 'executing' && (
                    <div className="space-y-2">
                      <div className="flex justify-between text-[8px] font-black text-muted-foreground uppercase tracking-widest mb-1">
                        <span>Evolução da Montagem</span>
                        <span className="text-primary">65%</span>
                      </div>
                      <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                        <div className="h-full bg-primary rounded-full transition-all duration-1000" style={{ width: '65%' }}></div>
                      </div>
                    </div>
                  )}

                  <div className="pt-3 border-t border-white/5 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-secondary border border-white/10 flex items-center justify-center text-[8px] font-bold">PM</div>
                      <span className="text-[9px] font-black text-muted-foreground uppercase italic tracking-tighter">Paulo Montador</span>
                    </div>
                    <button className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-[9px] font-black uppercase tracking-tighter hover:bg-white/10 transition-all flex items-center gap-2 italic">
                      <MessageSquare className="w-3 h-3" /> Suporte
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'profile' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-2 duration-300 pb-10">
             <div className="flex flex-col items-center text-center space-y-4 py-4">
                <div className="relative group">
                   <div className="absolute -inset-1 bg-primary/30 rounded-full blur opacity-50 group-hover:opacity-100 transition duration-500"></div>
                   <div className="relative w-24 h-24 rounded-full border-2 border-primary/50 bg-secondary overflow-hidden">
                      {profile?.avatar_url ? (
                        <img src={profile.avatar_url} alt="Logo" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-3xl font-black text-primary uppercase italic">
                           {profile?.company_name?.[0] || 'L'}
                        </div>
                      )}
                   </div>
                   <button className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-primary text-black flex items-center justify-center shadow-lg hover:scale-110 active:scale-95 transition-all">
                      <Camera className="w-4 h-4" />
                   </button>
                </div>
                <div>
                  <h3 className="text-xl font-black text-white uppercase italic tracking-tight">{profile?.company_name || 'Sua Loja'}</h3>
                  <div className="flex items-center justify-center gap-2 mt-1">
                    <span className="px-2 py-0.5 rounded-md bg-white/5 border border-white/10 text-[9px] font-bold text-primary uppercase tracking-[0.2em]">Sócio Elite</span>
                    <div className="flex items-center gap-0.5 text-[10px] font-black text-amber-500">
                      <Star className="w-3 h-3 fill-amber-500" /> {profile?.karma_score?.toFixed(1) || "5.0"}
                    </div>
                  </div>
                </div>
             </div>

             <div className="grid gap-3">
                <button className={`w-full p-4 rounded-2xl ${glassClass} border border-white/5 flex items-center justify-between group hover:border-primary/50 transition-all`}>
                   <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                         <Camera className="w-5 h-5" />
                      </div>
                      <div className="text-left">
                         <p className="text-[10px] font-black text-white uppercase italic">Portfólio de Projetos</p>
                         <p className="text-[8px] font-bold text-muted-foreground uppercase tracking-widest">12 Ambientes entregues</p>
                      </div>
                   </div>
                   <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary" />
                </button>

                <button className={`w-full p-4 rounded-2xl ${glassClass} border border-white/5 flex items-center justify-between group hover:border-primary/50 transition-all`}>
                   <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                         <MessageSquare className="w-5 h-5" />
                      </div>
                      <div className="text-left">
                         <p className="text-[10px] font-black text-white uppercase italic">Mural de Avaliações</p>
                         <p className="text-[8px] font-bold text-muted-foreground uppercase tracking-widest">Ver o que dizem de você</p>
                      </div>
                   </div>
                   <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary" />
                </button>

                <button className={`w-full p-4 rounded-2xl ${glassClass} border border-white/5 flex items-center justify-between group hover:border-primary/50 transition-all`}>
                   <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                         <MapPin className="w-5 h-5" />
                      </div>
                      <div className="text-left">
                         <p className="text-[10px] font-black text-white uppercase italic">Unidades & Filiais</p>
                         <p className="text-[8px] font-bold text-muted-foreground uppercase tracking-widest">Gerenciar endereços</p>
                      </div>
                   </div>
                   <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary" />
                </button>
             </div>
          </div>
        )}
      </div>

      {/* Mobile Bottom Navigation */}
      <nav className={`fixed bottom-0 left-0 right-0 h-16 md:hidden ${glassClass} border-t border-white/10 px-4 flex items-center justify-between z-50 backdrop-blur-2xl`}>
        <button 
          onClick={() => setActiveTab('overview')}
          className={`flex flex-col items-center gap-1 transition-all ${activeTab === 'overview' ? 'text-primary' : 'text-muted-foreground'}`}
        >
          <LayoutDashboard className={`w-5 h-5 ${activeTab === 'overview' ? 'scale-110' : ''}`} />
          <span className="text-[8px] font-black uppercase tracking-tighter">Início</span>
        </button>
        <button 
          onClick={() => setActiveTab('marketplace')}
          className={`flex flex-col items-center gap-1 transition-all ${activeTab === 'marketplace' ? 'text-primary' : 'text-muted-foreground'}`}
        >
          <Users className={`w-5 h-5 ${activeTab === 'marketplace' ? 'scale-110' : ''}`} />
          <span className="text-[8px] font-black uppercase tracking-tighter">Contratar</span>
        </button>
        <button 
          onClick={() => setActiveTab('os')}
          className={`flex flex-col items-center gap-1 transition-all ${activeTab === 'os' ? 'text-primary' : 'text-muted-foreground'}`}
        >
          <FileText className={`w-5 h-5 ${activeTab === 'os' ? 'scale-110' : ''}`} />
          <span className="text-[8px] font-black uppercase tracking-tighter">Minhas O.S.</span>
        </button>
        <button 
          onClick={() => setActiveTab('profile')}
          className={`flex flex-col items-center gap-1 transition-all ${activeTab === 'profile' ? 'text-primary' : 'text-muted-foreground'}`}
        >
          <User className={`w-5 h-5 ${activeTab === 'profile' ? 'scale-110' : ''}`} />
          <span className="text-[8px] font-black uppercase tracking-tighter">Perfil</span>
        </button>
      </nav>
    </div>
  );
}


// --- PRESTADOR DASHBOARD ---
function PrestadorDashboard({ glassClass, isFreePlan, onAction }: { glassClass: string, isFreePlan: boolean, onAction: (e: any, action: string) => boolean }) {
  const [isAvailable, setIsAvailable] = useState(true);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard icon={<Clock className="text-primary" />} label="Agenda Semana" value="06" glassClass={glassClass} />
        <StatCard icon={<CreditCard className="text-primary" />} label="A Receber" value="R$ 2.8k" glassClass={glassClass} />
        <StatCard icon={<CheckCircle2 className="text-primary" />} label="Concluídos" value="48" glassClass={glassClass} />
        <StatCard icon={<RefreshCcw className="text-primary" />} label="Propostas" value="04" glassClass={glassClass} />
      </div>

      <div className={`p-4 rounded-3xl ${glassClass} flex items-center justify-between`}>
        <div className="flex items-center gap-3">
          <div className={`w-3 h-3 rounded-full animate-pulse ${isAvailable ? 'bg-primary' : 'bg-red-500'}`}></div>
          <span className="text-xs font-black text-white uppercase tracking-widest italic">
            Status: {isAvailable ? 'Disponível para Trabalho' : 'Ocupado / Offline'}
          </span>
        </div>
        <button 
          onClick={() => setIsAvailable(!isAvailable)}
          className={`relative w-12 h-6 rounded-full transition-colors duration-300 ${isAvailable ? 'bg-primary' : 'bg-white/10'}`}
        >
          <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all duration-300 ${isAvailable ? 'right-1' : 'left-1'}`}></div>
        </button>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div className={`p-6 rounded-3xl ${glassClass}`}>
          <h2 className="text-lg font-black text-white uppercase italic flex items-center gap-2 mb-6">
            <Plus className="w-5 h-5 text-primary" />
            Convites e Propostas
          </h2>
          <div className="space-y-4">
            {[1, 2].map(i => (
              <div key={i} className="p-4 rounded-2xl bg-white/5 border border-white/5 space-y-4">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-xs font-black text-white uppercase">Móveis Dellanno - Jardins</p>
                    <p className="text-[10px] font-bold text-muted-foreground mt-0.5 uppercase">Contrato Real: R$ 45.000,00</p>
                  </div>
                  <span className="px-2 py-0.5 rounded bg-primary text-black text-[9px] font-black uppercase">Novo</span>
                </div>
                <div className="p-3 rounded-xl bg-black/20 border border-white/5">
                  <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest mb-1">Valor Oferecido</p>
                  <p className="text-lg font-black text-primary">R$ 850,00</p>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <button onClick={(e) => onAction(e, "aceitar propostas")} className="py-2 rounded-lg bg-primary text-black text-[9px] font-black uppercase hover:opacity-90 transition-all">Aceitar</button>
                  <button onClick={(e) => onAction(e, "enviar contrapropostas")} className="py-2 rounded-lg bg-white/5 border border-white/10 text-white text-[9px] font-black uppercase hover:bg-white/10 transition-all">Contra</button>
                  <button onClick={(e) => onAction(e, "recusar serviços")} className="py-2 rounded-lg bg-red-500/10 border border-red-500/20 text-red-500 text-[9px] font-black uppercase hover:bg-red-500/20 transition-all">Recusar</button>
                </div>

              </div>
            ))}
          </div>
        </div>

        <div className={`p-6 rounded-3xl ${glassClass}`}>
          <h2 className="text-lg font-black text-white uppercase italic flex items-center gap-2 mb-6">
            <Clock className="w-5 h-5 text-primary" />
            Minha Agenda
          </h2>
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="flex items-center gap-4 p-3 rounded-2xl hover:bg-white/5 transition-all group">
                <div className="w-10 h-10 rounded-xl bg-white/5 flex flex-col items-center justify-center border border-white/10 shrink-0">
                  <span className="text-[8px] font-black text-muted-foreground uppercase leading-none">JUL</span>
                  <span className="text-sm font-black text-white leading-none mt-1">2{i}</span>
                </div>
                <div className="flex-1">
                  <p className="text-xs font-black text-white uppercase truncate">Edifício Gran Park - Apto 12</p>
                  <p className="text-[9px] font-bold text-muted-foreground mt-0.5 flex items-center gap-1 uppercase">
                    <MapPin className="w-2 h-2" /> Vila Mariana, SP
                  </p>
                </div>
                <button className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center hover:text-primary transition-all">
                  <MessageSquare className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// --- FORNECEDOR DASHBOARD ---
function FornecedorDashboard({ glassClass, isFreePlan, onAction }: { glassClass: string, isFreePlan: boolean, onAction: (e: any, action: string) => boolean }) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <StatCard icon={<Eye className="text-primary" />} label="Visualizações" value="1.2k" glassClass={glassClass} />
        <StatCard icon={<MessageSquare className="text-primary" />} label="Solicitações" value="14" glassClass={glassClass} />
        <StatCard icon={<Megaphone className="text-primary" />} label="Ads Ativos" value="03" glassClass={glassClass} />
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        <div className={`md:col-span-2 p-6 rounded-3xl ${glassClass}`}>
          <h2 className="text-lg font-black text-white uppercase italic flex items-center gap-2 mb-6">
            <TrendingUp className="w-5 h-5 text-primary" />
            Oportunidades no Radar
          </h2>
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="p-4 rounded-2xl bg-white/5 border border-white/5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[9px] font-black px-2 py-0.5 rounded bg-primary/20 text-primary uppercase">Marmoraria</span>
                    <p className="text-xs font-black text-white uppercase italic">Cozinha Residencial - Granito</p>
                  </div>
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Solicitado por: Todeschini Vila Olimpia</p>
                </div>
                <button 
                  onClick={(e) => onAction(e, "oferecer orçamentos")}
                  className="px-6 py-3 rounded-xl bg-primary text-black text-[10px] font-black uppercase hover:opacity-90 transition-all shadow-lg active:scale-95"
                >
                  Oferecer Orçamento
                </button>

              </div>
            ))}
          </div>
        </div>

        <div className={`p-6 rounded-3xl ${glassClass}`}>
          <h2 className="text-lg font-black text-white uppercase italic flex items-center gap-2 mb-6">
            <Megaphone className="w-5 h-5 text-primary" />
            Meus Anúncios
          </h2>
          <div className="space-y-4">
            <div className="aspect-square rounded-2xl bg-white/5 border border-white/10 overflow-hidden relative group">
              <div className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center p-6 opacity-0 group-hover:opacity-100 transition-opacity">
                <p className="text-xs font-black text-white uppercase text-center mb-4 italic">Campanha Vitrine Julho</p>
                <div className="grid grid-cols-2 gap-4 w-full">
                   <div className="text-center">
                    <p className="text-[8px] font-bold text-muted-foreground uppercase">Cliques</p>
                    <p className="text-lg font-black text-primary">452</p>
                   </div>
                   <div className="text-center">
                    <p className="text-[8px] font-bold text-muted-foreground uppercase">CTR</p>
                    <p className="text-lg font-black text-primary">3.2%</p>
                   </div>
                </div>
              </div>
              <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                <LayoutDashboard className="w-8 h-8 opacity-20" />
              </div>
            </div>
            <button 
              onClick={(e) => onAction(e, "criar novos anúncios")}
              className="w-full py-3 rounded-xl bg-white/5 border border-white/10 text-white text-[10px] font-black uppercase hover:bg-white/10 transition-all"
            >
              Novo Anúncio
            </button>

          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, glassClass, color = "primary" }: { icon: any, label: string, value: string, glassClass: string, color?: "primary" | "amber" }) {
  const colorMap = {
    primary: "text-primary bg-primary/5",
    amber: "text-amber-500 bg-amber-500/5"
  };

  return (
    <div className={`p-5 rounded-2xl ${glassClass} border border-white/5 hover:border-white/10 transition-all group overflow-hidden relative`}>
      <div className="absolute top-0 right-0 p-2 opacity-5 group-hover:opacity-20 transition-opacity">
        {icon}
      </div>
      <div className="relative z-10">
        <div className="flex items-center justify-between mb-4">
          <div className={`p-2 rounded-lg ${colorMap[color]}`}>{icon}</div>
        </div>
        <p className="text-xl md:text-2xl font-black text-white italic">{value}</p>
        <p className="text-[8px] md:text-[9px] font-bold uppercase tracking-[0.2em] text-muted-foreground mt-1">{label}</p>
      </div>
    </div>
  );
}
