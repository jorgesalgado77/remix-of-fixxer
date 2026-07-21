import { Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { 
  Store, 
  PlusCircle, 
  Building2, 
  Star, 
  Activity, 
  LogOut, 
  Search,
  ChevronRight,
  Briefcase,
  Clock,
  DollarSign,
  Menu,
  ShieldCheck,
  User,
  Info,
  MapPin,
  Image as ImageIcon,
  Zap,
  Globe,
  Video,
  Phone,
  MessageCircle,
  Lock
} from "lucide-react";
import { usePerformanceMode } from "@/hooks/use-performance-mode";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { EscrowBadge } from "@/components/EscrowBadge";
import { toast } from "sonner";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

export function LojistaDashboard() {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isProfileComplete, setIsProfileComplete] = useState(false);
  const { glassClass } = usePerformanceMode();

  const handleTabChange = (tab: string) => {
    if ((tab === 'create' || tab === 'reviews') && !isProfileComplete) {
      toast.error("Perfil Incompleto", {
        description: "Você precisa preencher todos os campos obrigatórios e enviar o logo da empresa no menu Perfil antes de acessar esta funcionalidade.",
        duration: 5000,
      });
      setActiveTab('profile');
      return;
    }
    setActiveTab(tab);
    setMobileMenuOpen(false);
  };

  return (
    <div className="flex h-screen bg-black overflow-hidden font-sans text-white">
      {/* Mobile Top Header */}
      <div className="md:hidden fixed top-0 left-0 right-0 h-16 bg-[#050505]/95 backdrop-blur-md border-b border-white/10 z-50 flex items-center justify-between px-6">
        <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-primary rounded flex items-center justify-center text-black font-black text-sm">F</div>
            <h1 className="font-bold text-white text-sm uppercase italic">FIXXER</h1>
        </div>
        <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="p-2 text-white">
            <Menu className="w-6 h-6" />
        </button>
      </div>

      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-[60] bg-black/90 backdrop-blur-xl animate-in fade-in duration-300">
            <div className="flex flex-col h-full p-8 space-y-6 overflow-y-auto scrollbar-none">
                <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center text-black font-black text-xl">F</div>
                        <h1 className="font-bold text-white tracking-tight uppercase italic">FIXXER</h1>
                    </div>
                    <button onClick={() => setMobileMenuOpen(false)} className="p-2 text-white">
                        <PlusCircle className="w-6 h-6 rotate-45" />
                    </button>
                </div>

                <UserProfileCard isProfileComplete={isProfileComplete} />

                <TooltipProvider>
                  <nav className="flex flex-col gap-3">
                      <SidebarButton icon={<Activity className="w-5 h-5"/>} label="Visão Geral" active={activeTab === 'dashboard'} onClick={() => handleTabChange('dashboard')} />
                      
                      <NavButtonWithTooltip 
                        icon={<PlusCircle className="w-5 h-5"/>} 
                        label="Criar Serviço" 
                        active={activeTab === 'create'} 
                        onClick={() => handleTabChange('create')}
                        disabled={!isProfileComplete}
                      />

                      <SidebarButton icon={<Building2 className="w-5 h-5"/>} label="Perfil Empresa" active={activeTab === 'profile'} onClick={() => handleTabChange('profile')} />

                      <NavButtonWithTooltip 
                        icon={<Star className="w-5 h-5"/>} 
                        label="Avaliações" 
                        active={activeTab === 'reviews'} 
                        onClick={() => handleTabChange('reviews')}
                        disabled={!isProfileComplete}
                      />
                  </nav>
                </TooltipProvider>
                <div className="mt-auto pt-6 flex flex-col gap-4">
                    <Link to="/_authenticated/feed" onClick={() => setMobileMenuOpen(false)} className="flex items-center gap-3 px-4 py-4 rounded-2xl bg-white/5 border border-white/10 text-white font-black uppercase italic text-xs shadow-[0_0_15px_rgba(255,255,255,0.05)]">
                        <Search className="w-4 h-4" /> Ir para o Feed
                    </Link>
                    <Button variant="ghost" onClick={() => { /* Logout logic */ }} className="text-red-400 font-bold uppercase italic text-xs justify-start px-4 h-12">
                        <LogOut className="w-4 h-4 mr-2" /> Encerrar Sessão
                    </Button>
                </div>
            </div>
        </div>
      )}

      {/* Sidebar Retrátil (Desktop) */}
      <aside className="w-72 border-r border-white/10 p-6 flex flex-col gap-6 hidden md:flex bg-[#0A0A0A] overflow-y-auto scrollbar-none">
        <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center text-black font-black text-xl shadow-[0_0_15px_rgba(0,255,135,0.3)]">F</div>
            <h1 className="font-bold text-white tracking-tight uppercase italic">FIXXER</h1>
        </div>

        <UserProfileCard isProfileComplete={isProfileComplete} />

        <TooltipProvider>
          <nav className="flex flex-col gap-2">
              <SidebarButton icon={<Activity className="w-4 h-4"/>} label="Visão Geral" active={activeTab === 'dashboard'} onClick={() => handleTabChange('dashboard')} />
              
              <NavButtonWithTooltip 
                icon={<PlusCircle className="w-4 h-4"/>} 
                label="Criar Serviço" 
                active={activeTab === 'create'} 
                onClick={() => handleTabChange('create')}
                disabled={!isProfileComplete}
              />

              <SidebarButton icon={<Building2 className="w-4 h-4"/>} label="Perfil Empresa" active={activeTab === 'profile'} onClick={() => handleTabChange('profile')} />
              
              <NavButtonWithTooltip 
                icon={<Star className="w-4 h-4"/>} 
                label="Avaliações" 
                active={activeTab === 'reviews'} 
                onClick={() => handleTabChange('reviews')}
                disabled={!isProfileComplete}
              />
          </nav>
        </TooltipProvider>
        <div className="mt-auto pt-6 border-t border-white/10 flex flex-col gap-2">
            <Link to="/_authenticated/feed" className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-white/5 transition-all text-muted-foreground hover:text-white font-black uppercase italic text-xs tracking-wider">
                <Search className="w-4 h-4 text-primary" /> Ir para o Feed
            </Link>
            <Button variant="ghost" size="sm" className="text-red-400 hover:text-red-300 font-bold uppercase text-xs italic justify-start px-4">
              <LogOut className="w-4 h-4 mr-2" /> Sair do Sistema
            </Button>
        </div>
      </aside>

      {/* Conteúdo Principal */}
      <main className="flex-1 overflow-y-auto scrollbar-none bg-[#050505] pt-16 md:pt-0">
        <header className="px-8 py-6 border-b border-white/10 flex items-center justify-between sticky top-0 z-10 bg-[#050505]/80 backdrop-blur-md hidden md:flex">
           <div className="flex items-center gap-4">
               <h2 className="text-xl font-black text-white italic uppercase tracking-tighter">
                  {activeTab === 'dashboard' ? 'Painel Lojista' : activeTab === 'create' ? 'Publicar O.S.' : activeTab === 'profile' ? 'Perfil da Empresa' : 'Avaliações'}
               </h2>
           </div>
           <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20">
                <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                <span className="text-[10px] font-black text-primary uppercase italic">Sessão Ativa</span>
              </div>
           </div>
        </header>

        <div className="p-4 md:p-8 max-w-7xl mx-auto">
            {activeTab === 'dashboard' && <DashboardView />}
            {activeTab === 'create' && <CreateServiceView />}
            {activeTab === 'profile' && <ProfileView setIsProfileComplete={setIsProfileComplete} />}
            {activeTab === 'reviews' && <ReviewsView />}
        </div>
      </main>
    </div>
  );
}

function UserProfileCard({ isProfileComplete }: { isProfileComplete: boolean }) {
    return (
        <div className="p-4 rounded-2xl bg-[#1A1A1B] border border-white/10 space-y-3 shadow-xl">
            <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full border-2 border-primary/50 p-0.5 shadow-[0_0_15px_rgba(0,255,135,0.2)]">
                    <div className="w-full h-full rounded-full bg-black/40 flex items-center justify-center text-primary overflow-hidden">
                        <Store className="w-6 h-6" />
                    </div>
                </div>
                <div className="flex-1 overflow-hidden">
                    <div className="text-[11px] font-black text-white uppercase italic truncate">Marcenaria & Design Inovamad</div>
                    <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="px-1.5 py-0.5 rounded bg-primary/10 text-primary text-[8px] font-black uppercase">🏪 Lojista</span>
                    </div>
                </div>
            </div>
            
            <div className={`grid grid-cols-2 gap-2 pt-2 border-t border-white/5 ${!isProfileComplete ? 'opacity-50 grayscale' : ''}`}>
                <div className="flex flex-col">
                    <span className="text-[7px] font-bold text-muted-foreground uppercase tracking-widest">Reputação</span>
                    <div className="flex items-center gap-1">
                        <Star className="w-2.5 h-2.5 fill-primary text-primary" />
                        <span className="text-[10px] font-black text-white italic">4.9 / 5.0</span>
                    </div>
                </div>
                <div className="flex flex-col items-end">
                    <span className="text-[7px] font-bold text-muted-foreground uppercase tracking-widest text-right">Plano</span>
                    <div className="flex items-center gap-1">
                        <Zap className="w-2.5 h-2.5 text-amber-500 fill-amber-500" />
                        <span className="text-[10px] font-black text-amber-500 italic">Plano Pro</span>
                    </div>
                </div>
            </div>
            
            <div className="flex items-center justify-center gap-1.5 px-3 py-1 rounded-lg bg-primary/5 border border-primary/10">
                <ShieldCheck className="w-3 h-3 text-primary" />
                <span className="text-[8px] font-black text-primary uppercase italic">Selo Ouro FIXXER</span>
            </div>
        </div>
    );
}

function ReviewsView() {
    return (
        <div className="max-w-4xl space-y-8 animate-in fade-in duration-500">
            <div className="bg-[#1A1A1B] border border-white/10 p-8 rounded-3xl">
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h3 className="font-black text-white uppercase italic text-lg">Avaliações Recebidas</h3>
                        <div className="flex items-center gap-2 mt-1">
                            <span className="text-2xl font-black text-[#00FF87]">4.9</span>
                            <div className="flex gap-0.5">
                                {[1,2,3,4,5].map(i => <Star key={i} className="w-3 h-3 fill-[#00FF87] text-[#00FF87]" />)}
                            </div>
                            <span className="text-[10px] text-muted-foreground uppercase font-bold ml-2">24 depoimentos</span>
                        </div>
                    </div>
                </div>

                <div className="space-y-6">
                    {[1, 2].map(i => (
                        <div key={i} className="p-6 rounded-2xl bg-black/40 border border-white/5 space-y-4">
                            <div className="flex justify-between items-start">
                                <div className="flex gap-3">
                                    <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold">
                                        {i === 1 ? 'C' : 'M'}
                                    </div>
                                    <div>
                                        <div className="text-xs font-black text-white uppercase italic">{i === 1 ? 'Carlos Silva' : 'Marcos Oliveira'}</div>
                                        <div className="text-[8px] text-muted-foreground uppercase font-bold">{i === 1 ? 'Conferente Técnico' : 'Montador de Móveis'}</div>
                                    </div>
                                </div>
                                <div className="flex flex-col items-end">
                                    <div className="flex gap-0.5">
                                        {[1,2,3,4,5].map(s => <Star key={s} className={`w-2 h-2 ${s <= 5 ? 'fill-amber-500 text-amber-500' : 'text-white/10'}`} />)}
                                    </div>
                                    <span className="text-[8px] text-muted-foreground uppercase mt-1">12/07/2026</span>
                                </div>
                            </div>
                            <p className="text-[11px] text-white/70 leading-relaxed italic">
                                "{i === 1 ? 'Excelente empresa, projeto muito bem detalhado facilitando muito a conferência técnica. Recomendo!' : 'Pagamento rápido e equipe muito atenciosa no suporte. OS muito bem organizada.'}"
                            </p>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )
}

function SidebarButton({ icon, label, active, onClick, disabled }: any) {
    return (
        <button 
            onClick={onClick}
            disabled={disabled}
            className={`flex items-center justify-between px-4 py-3 rounded-xl transition-all w-full text-sm font-black uppercase italic tracking-wider ${
                active ? 'bg-[#00FF87] text-black' : 
                disabled ? 'bg-white/5 text-muted-foreground/30 cursor-not-allowed grayscale opacity-60' : 
                'hover:bg-white/5 text-muted-foreground'
            }`}
        >
            <div className="flex items-center gap-3">
                {icon} {label}
            </div>
            {disabled && <Lock className="w-3 h-3 opacity-50" />}
        </button>
    );
}

function NavButtonWithTooltip({ icon, label, active, onClick, disabled }: any) {
    if (!disabled) {
        return <SidebarButton icon={icon} label={label} active={active} onClick={onClick} />;
    }

    return (
        <Tooltip delayDuration={0}>
            <TooltipTrigger asChild>
                <div className="w-full touch-none">
                    <SidebarButton icon={icon} label={label} active={active} onClick={onClick} disabled={disabled} />
                </div>
            </TooltipTrigger>
            <TooltipContent 
                side="right" 
                align="center"
                className="bg-[#00FF87] text-black font-bold uppercase text-[9px] md:text-[10px] italic shadow-[0_0_20px_rgba(0,255,135,0.4)] z-[100] max-w-[200px] text-center"
            >
                Preencha o perfil completo para habilitar
            </TooltipContent>
        </Tooltip>
    );
}

function DashboardView() {
    const [filter, setFilter] = useState('Hoje');
    
    // Simulação de filtragem global (poderia ser baseada em dados reais)
    const getMultiplier = () => {
        switch(filter) {
            case 'Hoje': return 1;
            case '7 dias': return 4;
            case '30 dias': return 15;
            default: return 1;
        }
    };

    const multiplier = getMultiplier();

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            {/* Filtros Globais - Agora Responsivos */}
            <div className="bg-[#1A1A1B] border border-white/10 p-4 md:p-6 rounded-2xl md:rounded-3xl">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <h3 className="font-black text-white uppercase italic text-xs md:text-sm tracking-widest">Filtro de Período Global</h3>
                    <div className="flex flex-wrap gap-2 w-full sm:w-auto">
                        {['Hoje', '7 dias', '30 dias', 'Personalizado'].map(period => (
                            <button 
                                key={period} 
                                onClick={() => setFilter(period)}
                                className={`flex-1 sm:flex-none px-3 py-2 rounded-xl text-[9px] md:text-[10px] font-bold uppercase border transition-all ${
                                    filter === period 
                                    ? 'bg-[#00FF87] text-black border-[#00FF87] shadow-[0_0_15px_rgba(0,255,135,0.3)]' 
                                    : 'bg-white/5 border-white/5 text-muted-foreground hover:bg-white/10'
                                }`}
                            >
                                {period}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
                <MetricCard label="Serviços" value={(12 * multiplier).toString()} icon={<Briefcase />} color="text-blue-400" />
                <MetricCard label="Pendentes" value={(5 * multiplier).toString()} icon={<Clock />} color="text-amber-400" />
                <MetricCard label="Investimento" value={`R$ ${(15.2 * multiplier).toFixed(1)}k`} icon={<DollarSign />} color="text-emerald-400" />
                <MetricCard label="Reputação" value="4.9 ⭐" icon={<Star />} color="text-[#00FF87]" />
            </div>
            
            <div className="bg-[#1A1A1B] border border-white/10 p-6 md:p-8 rounded-2xl md:rounded-3xl">
                <h3 className="font-black text-white uppercase italic mb-6 text-sm md:text-base">Solicitações no Período</h3>
                
                <div className="space-y-3 md:space-y-4">
                    <div className="p-4 rounded-xl bg-black/40 border border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                           <div className="w-8 h-8 rounded-lg bg-blue-400/10 flex items-center justify-center text-blue-400">
                               <Briefcase className="w-4 h-4" />
                           </div>
                           <div>
                              <div className="text-xs font-black uppercase italic text-white">Montagem Dormitório</div>
                              <div className="text-[9px] md:text-[10px] text-muted-foreground uppercase tracking-wider">OS-2490 • São Paulo/SP</div>
                           </div>
                        </div>
                        <div className="flex items-center justify-between sm:justify-end gap-4 border-t sm:border-t-0 border-white/5 pt-3 sm:pt-0">
                           <span className="font-black text-xs text-white">R$ 450,00</span>
                           <span className="px-3 py-1 bg-[#00FF87]/10 text-[#00FF87] font-bold text-[9px] rounded-full uppercase">Concluído</span>
                        </div>
                    </div>
                    <div className="p-4 rounded-xl bg-black/40 border border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                           <div className="w-8 h-8 rounded-lg bg-amber-400/10 flex items-center justify-center text-amber-400">
                               <Clock className="w-4 h-4" />
                           </div>
                           <div>
                              <div className="text-xs font-black uppercase italic text-white">Medição Cozinha</div>
                              <div className="text-[9px] md:text-[10px] text-muted-foreground uppercase tracking-wider">OS-2491 • Campinas/SP</div>
                           </div>
                        </div>
                        <div className="flex items-center justify-between sm:justify-end gap-4 border-t sm:border-t-0 border-white/5 pt-3 sm:pt-0">
                           <span className="font-black text-xs text-white">R$ 200,00</span>
                           <span className="px-3 py-1 bg-amber-500/10 text-amber-500 font-bold text-[9px] rounded-full uppercase">Pendente</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

function CreateServiceView() {
    return (
        <div className="max-w-3xl mx-auto animate-in slide-in-from-bottom duration-500 pb-20">
          <div className="bg-[#1A1A1B] border border-white/10 p-5 md:p-8 rounded-2xl md:rounded-3xl space-y-6 md:space-y-8 shadow-2xl">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 md:gap-6">
                <div className="space-y-2">
                    <Label className="uppercase font-bold text-[10px] text-muted-foreground tracking-widest">Tipo de Profissional</Label>
                    <Select>
                        <SelectTrigger className="bg-black/40 border-white/10 h-12 rounded-xl text-xs md:text-sm">
                            <SelectValue placeholder="Selecione o parceiro..." />
                        </SelectTrigger>
                        <SelectContent className="bg-[#1A1A1B] border-white/10 z-[100]">
                            <SelectItem value="montador" className="text-xs md:text-sm">Montador de Móveis</SelectItem>
                            <SelectItem value="conferente" className="text-xs md:text-sm">Conferente Técnico</SelectItem>
                            <SelectItem value="projetista" className="text-xs md:text-sm">Projetista</SelectItem>
                            <SelectItem value="medidor" className="text-xs md:text-sm">Medidor</SelectItem>
                            <SelectItem value="instalador" className="text-xs md:text-sm">Instalador</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                <div className="space-y-2">
                    <Label className="uppercase font-bold text-[10px] text-muted-foreground tracking-widest">Título do Serviço</Label>
                    <Input placeholder="Ex: Medição Técnica Cozinha" className="bg-black/40 border-white/10 h-12 rounded-xl text-xs md:text-sm" />
                </div>
            </div>
            
            <div className="space-y-2">
                <Label className="uppercase font-bold text-[10px] text-muted-foreground tracking-widest">Descrição Detalhada</Label>
                <Textarea placeholder="Descreva as especificações técnicas..." className="bg-black/40 border-white/10 min-h-[120px] md:min-h-[150px] rounded-xl p-4 text-xs md:text-sm" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 md:gap-6">
                <div className="space-y-2">
                    <Label className="uppercase font-bold text-[10px] text-muted-foreground tracking-widest">Valor Contrato Final (R$)</Label>
                    <Input type="number" placeholder="20000.00" className="bg-black/40 border-white/10 h-12 rounded-xl text-xs md:text-sm" />
                </div>
                <div className="space-y-2">
                    <Label className="uppercase font-bold text-[10px] text-muted-foreground tracking-widest">Localização (Cidade/UF)</Label>
                    <Input placeholder="Ex: São Paulo/SP" className="bg-black/40 border-white/10 h-12 rounded-xl text-xs md:text-sm" />
                </div>
            </div>

            <Button className="w-full bg-[#00FF87] text-black font-black uppercase italic tracking-widest hover:bg-[#00FF87]/90 h-14 rounded-2xl shadow-[0_0_30px_rgba(0,255,135,0.2)] text-xs md:text-sm">
                Publicar Serviço no Feed
            </Button>
          </div>
        </div>
    )
}

function ProfileView({ setIsProfileComplete }: { setIsProfileComplete: (complete: boolean) => void }) {
    const [cep, setCep] = useState("");
    const [address, setAddress] = useState({
        logradouro: "",
        bairro: "",
        localidade: "",
        uf: "",
        numero: "",
        complemento: ""
    });
    const [isLoadingCep, setIsLoadingCep] = useState(false);

    useEffect(() => {
        if (cep.replace(/\D/g, '').length === 8) {
            handleCepLookup(cep);
        }
    }, [cep]);

    const handleCepLookup = async (value: string) => {
        const cleanCep = value.replace(/\D/g, '');
        setIsLoadingCep(true);
        try {
            const response = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
            const data = await response.json();
            if (!data.erro) {
                setAddress(prev => ({
                    ...prev,
                    logradouro: data.logradouro,
                    bairro: data.bairro,
                    localidade: data.localidade,
                    uf: data.uf
                }));
            }
        } catch (error) {
            console.error("Erro ao buscar CEP:", error);
        } finally {
            setIsLoadingCep(false);
        }
    };

    return (
        <div className="max-w-4xl space-y-8 animate-in fade-in duration-500 pb-20">
            <div className="bg-[#1A1A1B] border border-white/10 p-8 rounded-3xl space-y-8 shadow-2xl">
                 <div className="flex items-center gap-4 mb-4 pb-4 border-b border-white/5">
                     <div className="w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shadow-[0_0_15px_rgba(0,255,135,0.1)]">
                         <Building2 className="w-8 h-8" />
                     </div>
                     <div>
                         <h3 className="font-black text-white uppercase italic text-lg tracking-tight">Perfil da Empresa</h3>
                         <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest">Mantenha seus dados atualizados para gerar confiança.</p>
                     </div>
                 </div>

                 <div className="space-y-6">
                    <h4 className="text-xs font-black uppercase italic text-primary flex items-center gap-2">
                        <User className="w-3 h-3" /> Dados da Empresa e Responsável
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                           <Label className="uppercase font-bold text-[10px] text-muted-foreground tracking-widest">Nome Fantasia da Empresa *</Label>
                           <Input required placeholder="FIXXER Móveis Planejados" className="bg-black/40 border-white/10 h-12 rounded-xl focus:border-primary/50 transition-all" />
                        </div>
                        <div className="space-y-2">
                           <Label className="uppercase font-bold text-[10px] text-muted-foreground tracking-widest">Razão Social *</Label>
                           <Input required placeholder="FIXXER LTDA" className="bg-black/40 border-white/10 h-12 rounded-xl focus:border-primary/50 transition-all" />
                        </div>
                        <div className="space-y-2">
                           <Label className="uppercase font-bold text-[10px] text-muted-foreground tracking-widest">CNPJ *</Label>
                           <Input required placeholder="00.000.000/0001-00" className="bg-black/40 border-white/10 h-12 rounded-xl focus:border-primary/50 transition-all" />
                        </div>
                        <div className="space-y-2">
                           <Label className="uppercase font-bold text-[10px] text-muted-foreground tracking-widest">Nome do Responsável (Obrigatório) *</Label>
                           <Input required placeholder="Digite o nome do responsável" className="bg-black/40 border-white/10 h-12 rounded-xl focus:border-primary/50 transition-all" />
                        </div>
                        <div className="space-y-2">
                           <Label className="uppercase font-bold text-[10px] text-muted-foreground tracking-widest">E-mail de Contato Principal *</Label>
                           <Input required type="email" placeholder="contato@fixxer.com.br" className="bg-black/40 border-white/10 h-12 rounded-xl focus:border-primary/50 transition-all" />
                        </div>
                        <div className="space-y-2">
                           <Label className="uppercase font-bold text-[10px] text-muted-foreground tracking-widest flex items-center gap-2">
                             <MessageCircle className="w-3 h-3 text-[#25D366]" /> WhatsApp (Comercial) *
                           </Label>
                           <Input required placeholder="(11) 99999-9999" className="bg-black/40 border-white/10 h-12 rounded-xl focus:border-[#25D366]/50 transition-all" />
                        </div>
                        <div className="space-y-2">
                           <Label className="uppercase font-bold text-[10px] text-muted-foreground tracking-widest flex items-center gap-2">
                             <Phone className="w-3 h-3 text-blue-400" /> Telefone Fixo (Opcional)
                           </Label>
                           <Input placeholder="(11) 4000-0000" className="bg-black/40 border-white/10 h-12 rounded-xl focus:border-blue-400/50 transition-all" />
                        </div>
                    </div>
                 </div>

                 <div className="space-y-6 pt-6 border-t border-white/5">
                    <h4 className="text-xs font-black uppercase italic text-primary flex items-center gap-2">
                        <Globe className="w-3 h-3" /> Redes Sociais e Site
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                           <Label className="uppercase font-bold text-[10px] text-muted-foreground tracking-widest flex items-center gap-2">
                             <div className="w-3 h-3 rounded-sm bg-gradient-to-tr from-amber-400 via-pink-500 to-purple-600" /> Instagram
                           </Label>
                           <Input placeholder="@suaempresa" className="bg-black/40 border-white/10 h-12 rounded-xl focus:border-pink-500/50 transition-all" />
                        </div>
                        <div className="space-y-2">
                           <Label className="uppercase font-bold text-[10px] text-muted-foreground tracking-widest flex items-center gap-2">
                             <div className="w-3 h-3 rounded-full bg-[#1877F2] flex items-center justify-center text-[8px] font-bold">f</div> Facebook
                           </Label>
                           <Input placeholder="facebook.com/suaempresa" className="bg-black/40 border-white/10 h-12 rounded-xl focus:border-[#1877F2]/50 transition-all" />
                        </div>
                        <div className="space-y-2">
                           <Label className="uppercase font-bold text-[10px] text-muted-foreground tracking-widest flex items-center gap-2">
                             <Video className="w-3 h-3 text-white" /> TikTok
                           </Label>
                           <Input placeholder="@suaempresa" className="bg-black/40 border-white/10 h-12 rounded-xl focus:border-white/30 transition-all" />
                        </div>
                        <div className="space-y-2">
                           <Label className="uppercase font-bold text-[10px] text-muted-foreground tracking-widest flex items-center gap-2">
                             <Globe className="w-3 h-3 text-blue-400" /> Site Oficial
                           </Label>
                           <Input placeholder="https://www.suaempresa.com.br" className="bg-black/40 border-white/10 h-12 rounded-xl focus:border-blue-400/50 transition-all" />
                        </div>
                    </div>
                 </div>

                 <div className="space-y-6 pt-6 border-t border-white/5">
                    <h4 className="text-xs font-black uppercase italic text-primary flex items-center gap-2">
                        <MapPin className="w-3 h-3" /> Endereço Completo
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="space-y-2 relative">
                           <Label className="uppercase font-bold text-[10px] text-muted-foreground tracking-widest">CEP *</Label>
                           <Input 
                             required
                             value={cep} 
                             onChange={(e) => setCep(e.target.value)}
                             placeholder="00000-000" 
                             className="bg-black/40 border-white/10 h-12 rounded-xl focus:border-primary/50 transition-all" 
                           />
                           {isLoadingCep && <div className="absolute right-3 bottom-3 animate-spin w-4 h-4 border-2 border-primary border-t-transparent rounded-full" />}
                        </div>
                        <div className="md:col-span-2 space-y-2">
                           <Label className="uppercase font-bold text-[10px] text-muted-foreground tracking-widest">Logradouro / Rua *</Label>
                           <Input 
                             required
                             value={address.logradouro} 
                             onChange={(e) => setAddress({...address, logradouro: e.target.value})}
                             placeholder="Rua, Avenida..." 
                             className="bg-black/40 border-white/10 h-12 rounded-xl focus:border-primary/50 transition-all" 
                           />
                        </div>
                        <div className="space-y-2">
                           <Label className="uppercase font-bold text-[10px] text-muted-foreground tracking-widest">Bairro *</Label>
                           <Input 
                             required
                             value={address.bairro} 
                             onChange={(e) => setAddress({...address, bairro: e.target.value})}
                             placeholder="Bairro" 
                             className="bg-black/40 border-white/10 h-12 rounded-xl focus:border-primary/50 transition-all" 
                           />
                        </div>
                        <div className="space-y-2">
                           <Label className="uppercase font-bold text-[10px] text-muted-foreground tracking-widest">Cidade *</Label>
                           <Input 
                             required
                             value={address.localidade} 
                             onChange={(e) => setAddress({...address, localidade: e.target.value})}
                             placeholder="Cidade" 
                             className="bg-black/40 border-white/10 h-12 rounded-xl focus:border-primary/50 transition-all" 
                           />
                        </div>
                        <div className="space-y-2">
                           <Label className="uppercase font-bold text-[10px] text-muted-foreground tracking-widest">Estado / UF *</Label>
                           <Input 
                             required
                             value={address.uf} 
                             onChange={(e) => setAddress({...address, uf: e.target.value})}
                             placeholder="UF" 
                             className="bg-black/40 border-white/10 h-12 rounded-xl focus:border-primary/50 transition-all" 
                           />
                        </div>
                        <div className="space-y-2">
                           <Label className="uppercase font-bold text-[10px] text-muted-foreground tracking-widest">Número *</Label>
                           <Input required placeholder="123" className="bg-black/40 border-white/10 h-12 rounded-xl focus:border-primary/50 transition-all" />
                        </div>
                        <div className="md:col-span-2 space-y-2">
                           <Label className="uppercase font-bold text-[10px] text-muted-foreground tracking-widest">Complemento</Label>
                           <Input placeholder="Sala, Bloco, etc." className="bg-black/40 border-white/10 h-12 rounded-xl focus:border-primary/50 transition-all" />
                        </div>
                    </div>
                 </div>

                 <div className="space-y-6 pt-6 border-t border-white/5">
                    <h4 className="text-xs font-black uppercase italic text-primary flex items-center gap-2">
                        <ImageIcon className="w-3 h-3" /> Mídia e Identidade Visual
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <Label className="uppercase font-bold text-[10px] text-muted-foreground tracking-widest">Logo da Empresa *</Label>
                            <div className="h-40 rounded-3xl border-2 border-dashed border-white/10 flex flex-col items-center justify-center gap-3 hover:border-primary/50 transition-all cursor-pointer bg-black/20 group relative overflow-hidden shadow-inner">
                                <PlusCircle className="w-8 h-8 text-muted-foreground group-hover:text-primary transition-colors" />
                                <span className="text-[10px] font-black uppercase text-muted-foreground group-hover:text-primary transition-colors">Upload Logo</span>
                                <div className="absolute inset-0 bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label className="uppercase font-bold text-[10px] text-muted-foreground tracking-widest">Banner da Empresa</Label>
                            <div className="h-40 rounded-3xl border-2 border-dashed border-white/10 flex flex-col items-center justify-center gap-3 hover:border-primary/50 transition-all cursor-pointer bg-black/20 group relative overflow-hidden shadow-inner">
                                <PlusCircle className="w-8 h-8 text-muted-foreground group-hover:text-primary transition-colors" />
                                <span className="text-[10px] font-black uppercase text-muted-foreground group-hover:text-primary transition-colors">Upload Banner</span>
                                <div className="absolute inset-0 bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                            </div>
                        </div>
                    </div>
                    
                    <div className="space-y-2">
                        <Label className="uppercase font-bold text-[10px] text-muted-foreground tracking-widest">Galeria de Fotos da Empresa</Label>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            {[1, 2, 3].map(i => (
                                <div key={i} className="aspect-square rounded-2xl border-2 border-dashed border-white/10 flex items-center justify-center hover:border-primary/30 transition-all cursor-pointer bg-black/20 group">
                                    <PlusCircle className="w-6 h-6 text-muted-foreground group-hover:text-primary/50" />
                                </div>
                            ))}
                            <div className="aspect-square rounded-2xl border-2 border-dashed border-primary/20 flex flex-col items-center justify-center gap-1 bg-primary/5 hover:bg-primary/10 transition-all cursor-pointer group">
                                <PlusCircle className="w-6 h-6 text-primary group-hover:scale-110 transition-transform" />
                                <span className="text-[8px] font-black text-primary uppercase">Adicionar</span>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label className="uppercase font-bold text-[10px] text-muted-foreground tracking-widest">Vídeos da Empresa (Até 3 vídeos)</Label>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {[1, 2, 3].map(i => (
                                <div key={i} className="h-40 rounded-2xl border-2 border-dashed border-white/10 flex items-center justify-center hover:border-primary/30 transition-all cursor-pointer bg-black/20 group">
                                    <PlusCircle className="w-8 h-8 text-muted-foreground group-hover:text-primary/50" />
                                    <span className="text-[10px] font-black text-muted-foreground uppercase ml-2">Vídeo {i}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                 </div>

                 <div className="pt-6 border-t border-white/5 flex flex-col md:flex-row gap-4 items-center justify-between">
                    <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#00FF87]/10 border border-[#00FF87]/20">
                        <Star className="w-4 h-4 fill-[#00FF87] text-[#00FF87]" />
                        <span className="text-xs font-black text-white italic">Reputação Atual: <span className="text-[#00FF87]">4.9 / 5.0</span></span>
                    </div>
                    <Button 
                        onClick={() => {
                            setIsProfileComplete(true);
                            toast.success("Perfil Atualizado", {
                                description: "Seus dados foram salvos com sucesso. Agora você pode acessar todas as funcionalidades.",
                            });
                        }}
                        className="w-full md:w-auto px-12 bg-primary text-black font-black uppercase italic tracking-widest hover:bg-primary/90 h-14 rounded-2xl shadow-[0_0_30px_rgba(0,255,135,0.2)] transition-all active:scale-[0.98]"
                    >
                        Salvar Todas as Alterações
                    </Button>
                 </div>
            </div>
        </div>
    )
}

function MetricCard({ label, value, icon, color }: any) {
    return (
        <div className="bg-[#1A1A1B] border border-white/10 p-4 md:p-6 rounded-2xl md:rounded-3xl space-y-1 md:space-y-2 relative overflow-hidden group hover:border-primary/30 transition-all">
            <div className={`${color} opacity-80 mb-1 md:mb-2 group-hover:scale-110 transition-transform`}>{icon}</div>
            <div className="text-[9px] md:text-xs font-bold text-muted-foreground uppercase tracking-wider">{label}</div>
            <div className="text-lg md:text-2xl font-black text-white italic truncate">{value}</div>
            <div className={`absolute top-0 right-0 w-12 h-12 ${color} opacity-[0.03] -mr-6 -mt-6 rounded-full`} />
        </div>
    )
}
