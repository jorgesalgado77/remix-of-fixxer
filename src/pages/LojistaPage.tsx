import { Link } from "@tanstack/react-router";
import { useState, useEffect, useRef } from "react";
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
  Lock,
  Filter,
  CheckCircle2,
  AlertCircle,
  Trash2,
  X,
  Crop,
  Download,
  History
} from "lucide-react";
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { supabaseExternal } from "@/lib/supabaseExternal";
import { usePerformanceMode } from "@/hooks/use-performance-mode";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { EscrowBadge } from "@/components/EscrowBadge";
import { toast } from "sonner";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { IMaskInput } from "react-imask";
import { useMediaUpload } from "@/hooks/use-media-upload";
import { Progress } from "@/components/ui/progress";
import { ActivitySelect } from "@/components/ActivitySelect";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragOverlay } from "@dnd-kit/core";
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, rectSortingStrategy } from "@dnd-kit/sortable";

export function LojistaDashboard() {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isProfileComplete, setIsProfileComplete] = useState(false);
  const [rating, setRating] = useState(4.9);
  const { glassClass } = usePerformanceMode();
  
  useEffect(() => {
    const handleTabChangeEvent = (e: any) => {
      if (e.detail) {
        setActiveTab(e.detail);
      }
    };
    window.addEventListener('change-tab', handleTabChangeEvent);
    return () => window.removeEventListener('change-tab', handleTabChangeEvent);
  }, []);

  const getRatingColor = (val: number) => {
    if (val <= 1.5) return "text-red-500";
    if (val <= 2.5) return "text-orange-500";
    if (val <= 3.5) return "text-yellow-500";
    if (val <= 4.9) return "text-green-500";
    return "text-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.5)]";
  };

  const getRatingStarColor = (val: number) => {
    if (val <= 1.5) return "text-red-500 fill-red-500";
    if (val <= 2.5) return "text-orange-500 fill-orange-500";
    if (val <= 3.5) return "text-yellow-500 fill-yellow-500";
    if (val <= 4.9) return "text-green-500 fill-green-500";
    return "text-amber-400 fill-amber-400";
  };

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

                <UserProfileCard isProfileComplete={isProfileComplete} rating={rating} getRatingStarColor={getRatingStarColor} getRatingColor={getRatingColor} />


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

        <UserProfileCard isProfileComplete={isProfileComplete} rating={rating} getRatingStarColor={getRatingStarColor} getRatingColor={getRatingColor} />


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
            {activeTab === 'dashboard' && <DashboardView rating={rating} getRatingColor={getRatingColor} />}
            {activeTab === 'create' && <CreateServiceView />}
            {activeTab === 'profile' && <ProfileView setIsProfileComplete={setIsProfileComplete} rating={rating} getRatingColor={getRatingColor} setRating={setRating} />}
            {activeTab === 'reviews' && <ReviewsView />}
        </div>
      </main>
    </div>
  );
}

function UserProfileCard({ isProfileComplete, rating, getRatingStarColor, getRatingColor }: { isProfileComplete: boolean; rating: number; getRatingStarColor: (val: number) => string; getRatingColor: (val: number) => string }) {
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
                        <Star className={`w-2.5 h-2.5 ${getRatingStarColor(rating)}`} />
                        <span className={`text-[10px] font-black italic ${getRatingColor(rating)}`}>{rating.toFixed(1)} / 5.0</span>
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
                side="bottom" 
                align="center"
                className="bg-[#00FF87] text-black font-bold uppercase text-[9px] md:text-[10px] italic shadow-[0_0_20px_rgba(0,255,135,0.4)] z-[100] max-w-[200px] text-center md:side-right"
            >
                Preencha o perfil completo para habilitar
            </TooltipContent>
        </Tooltip>
    );
}

function DashboardView({ rating, getRatingColor }: { rating: number; getRatingColor: (val: number) => string }) {
    const [filter, setFilter] = useState('Hoje');
    const [statusFilter, setStatusFilter] = useState('Todos');
    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 3;
    const [customDates, setCustomDates] = useState({ start: '', end: '' });
    const [expandedServiceId, setExpandedServiceId] = useState<number | null>(null);

    const exportToPDF = (service: any) => {
        const doc = new jsPDF();
        
        // Header
        doc.setFillColor(0, 255, 135); // Primary color
        doc.rect(0, 0, 210, 40, 'F');
        
        doc.setTextColor(0, 0, 0);
        doc.setFontSize(22);
        doc.setFont("helvetica", "bold");
        doc.text("FIXXER - RELATÓRIO DE O.S.", 105, 20, { align: "center" });
        
        doc.setFontSize(10);
        doc.text(`Exportado em: ${new Date().toLocaleString()}`, 105, 30, { align: "center" });

        // Service Info
        doc.setTextColor(0, 0, 0);
        doc.setFontSize(14);
        doc.text(`O.S. #${service.id} - ${service.title}`, 15, 55);
        
        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        const details = [
            ["Status Atual:", service.status],
            ["Localização:", service.location],
            ["Valor:", service.value],
            ["Prazo:", service.deadline],
        ];

        autoTable(doc, {
            startY: 65,
            head: [['Campo', 'Valor']],
            body: details,
            theme: 'striped',
            headStyles: { fillColor: [0, 255, 135], textColor: [0, 0, 0] }
        });

        // History
        doc.setFontSize(14);
        doc.setFont("helvetica", "bold");
        doc.text("Histórico de Status", 15, (doc as any).lastAutoTable.finalY + 15);

        const history = [
            ["Hoje às 14:30", service.status, "Por Sistema"],
            ["10/07 às 09:15", "OS Criada", "Por Marcenaria Inovamad"]
        ];

        autoTable(doc, {
            startY: (doc as any).lastAutoTable.finalY + 20,
            head: [['Data/Hora', 'Status', 'Responsável']],
            body: history,
            theme: 'grid',
            headStyles: { fillColor: [50, 50, 50], textColor: [255, 255, 255] }
        });

        doc.save(`FIXXER_OS_${service.id}.pdf`);
        toast.success("PDF gerado com sucesso!");
    };

    
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
                    <div className="flex flex-col gap-3 w-full sm:w-auto">
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

                        {filter === 'Personalizado' && (
                            <div className="flex flex-col sm:flex-row gap-2 animate-in slide-in-from-top-2 duration-300">
                                <div className="flex-1 space-y-1">
                                    <Label className="text-[8px] uppercase font-bold text-muted-foreground">Início</Label>
                                    <Input 
                                        type="date" 
                                        value={customDates.start}
                                        onChange={(e) => setCustomDates({...customDates, start: e.target.value})}
                                        className="bg-black/40 border-white/10 h-9 rounded-lg text-[10px] text-white" 
                                    />
                                </div>
                                <div className="flex-1 space-y-1">
                                    <Label className="text-[8px] uppercase font-bold text-muted-foreground">Fim</Label>
                                    <Input 
                                        type="date" 
                                        value={customDates.end}
                                        onChange={(e) => setCustomDates({...customDates, end: e.target.value})}
                                        className="bg-black/40 border-white/10 h-9 rounded-lg text-[10px] text-white" 
                                    />
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 md:gap-4">
                <MetricCard label="Serviços Criados" value={(12 * multiplier).toString()} icon={<Briefcase />} color="text-blue-400" />
                <MetricCard 
                    label="Serviços Pendentes" 
                    value={(5 * multiplier).toString()} 
                    icon={<Clock />} 
                    color="text-orange-400" 
                    subValue={
                        <div className="flex flex-col gap-0.5 mt-1 border-t border-white/5 pt-1">
                            <div className="flex justify-between items-center text-[7px] md:text-[8px] font-bold uppercase">
                                <span className="text-muted-foreground">Aguardando:</span>
                                <span className="text-white">{(2 * multiplier)}</span>
                            </div>
                            <div className="flex justify-between items-center text-[7px] md:text-[8px] font-bold uppercase">
                                <span className="text-muted-foreground">Em andamento:</span>
                                <span className="text-white">{(2 * multiplier)}</span>
                            </div>
                            <div className="flex justify-between items-center text-[7px] md:text-[8px] font-bold uppercase">
                                <span className="text-muted-foreground">Atrasado:</span>
                                <span className="text-red-500">{(1 * multiplier)}</span>
                            </div>
                            <div className="mt-1 flex items-center gap-1 text-[7px] font-black italic uppercase">
                                <span className="text-green-400">↑ 12%</span>
                                <span className="text-muted-foreground/50">vs. semana ant.</span>
                            </div>
                        </div>
                    }
                />
                <MetricCard label="Concluídos" value={(7 * multiplier).toString()} icon={<ShieldCheck />} color="text-primary" />
                <MetricCard 
                    label="Saldo do Período" 
                    value={`R$ ${(15.2 * multiplier).toFixed(1)}k`} 
                    icon={<DollarSign />} 
                    color="text-emerald-400"
                    subValue={
                        <div className="flex flex-col gap-0.5 mt-1 border-t border-white/5 pt-1">
                            <span className="text-[7px] md:text-[8px] font-bold text-muted-foreground uppercase">Fixo: <span className="text-white">R$ {(12.1 * multiplier).toFixed(1)}k</span></span>
                            <span className="text-[7px] md:text-[8px] font-bold text-muted-foreground uppercase">Comissões: <span className="text-white">R$ {(3.1 * multiplier).toFixed(1)}k</span></span>
                        </div>
                    }
                />
                <MetricCard label="Reputação" value={`${rating.toFixed(1)} ⭐`} icon={<Star />} color={getRatingColor(rating)} />
            </div>
            
            <div className="bg-[#1A1A1B] border border-white/10 p-6 md:p-8 rounded-2xl md:rounded-3xl">
                <div className="flex flex-col space-y-4 mb-6">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                        <h3 className="font-black text-white uppercase italic text-sm md:text-base">Solicitações no Período</h3>
                        <div className="relative w-full sm:w-64">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <Input 
                                placeholder="Buscar OS ou título..." 
                                value={searchTerm}
                                onChange={(e) => {
                                    setSearchTerm(e.target.value);
                                    setCurrentPage(1);
                                }}
                                className="bg-black/40 border-white/10 pl-10 h-10 rounded-xl text-xs"
                            />
                        </div>
                    </div>
                    
                    <div className="flex flex-wrap gap-2">
                        {['Todos', 'Pendente', 'Concluído', 'Em andamento', 'Atrasado'].map((status) => (
                            <button
                                key={status}
                                onClick={() => {
                                    setStatusFilter(status);
                                    setCurrentPage(1);
                                }}
                                className={`px-3 py-1.5 rounded-full text-[8px] md:text-[9px] font-black uppercase italic transition-all border ${
                                    statusFilter === status
                                        ? 'bg-primary text-black border-primary'
                                        : 'bg-white/5 border-white/10 text-muted-foreground hover:bg-white/10'
                                }`}
                            >
                                {status}
                            </button>
                        ))}
                    </div>
                </div>
                
                <div className="space-y-3 md:space-y-4">
                    {(() => {
                        const services = [
                            { id: 2490, title: 'Montagem Dormitório', location: 'São Paulo/SP', value: 'R$ 450,00', deadline: '15/07', status: 'Concluído', color: 'text-primary', bg: 'bg-primary/10', icon: <Briefcase className="w-4 h-4" /> },
                            { id: 2491, title: 'Medição Cozinha', location: 'Campinas/SP', value: 'R$ 200,00', deadline: '18/07', status: 'Pendente', color: 'text-orange-400', bg: 'bg-orange-400/10', icon: <Clock className="w-4 h-4" /> },
                            { id: 2492, title: 'Instalação Cooktop', location: 'Santos/SP', value: 'R$ 150,00', deadline: '20/07', status: 'Em andamento', color: 'text-blue-400', bg: 'bg-blue-400/10', icon: <Activity className="w-4 h-4" /> },
                            { id: 2493, title: 'Reparo Dobradiças', location: 'Jundiaí/SP', value: 'R$ 80,00', deadline: '10/07', status: 'Atrasado', color: 'text-red-500', bg: 'bg-red-500/10', icon: <AlertCircle className="w-4 h-4" /> },
                            { id: 2494, title: 'Ajuste Portas', location: 'Osasco/SP', value: 'R$ 120,00', deadline: '22/07', status: 'Pendente', color: 'text-orange-400', bg: 'bg-orange-400/10', icon: <Clock className="w-4 h-4" /> }
                        ];

                        const filtered = services.filter(s => {
                            const matchesStatus = statusFilter === 'Todos' || s.status === statusFilter;
                            const matchesSearch = s.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                                                s.id.toString().includes(searchTerm);
                            return matchesStatus && matchesSearch;
                        });

                        const totalPages = Math.ceil(filtered.length / itemsPerPage);
                        const paginated = filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

                        return (
                            <>
                                {paginated.length > 0 ? paginated.map((service) => (
                                    <div key={service.id} className="group flex flex-col rounded-xl overflow-hidden bg-black/40 border border-white/5 transition-all hover:border-white/20">
                                        <div className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                            <div className="flex items-center gap-3">
                                            <div className={`w-8 h-8 rounded-lg ${service.bg} flex items-center justify-center ${service.color}`}>
                                                {service.icon}
                                            </div>
                                            <div>
                                                <div className="text-xs font-black uppercase italic text-white">{service.title}</div>
                                                <div className="text-[9px] md:text-[10px] text-muted-foreground uppercase tracking-wider">OS-{service.id} • {service.location}</div>
                                            </div>
                                            </div>
                                            <div className="flex items-center justify-between sm:justify-end gap-3 border-t sm:border-t-0 border-white/5 pt-3 sm:pt-0 w-full sm:w-auto">
                                            <div className="flex flex-col items-end mr-2">
                                                <span className="font-black text-xs text-white">{service.value}</span>
                                                <span className="text-[7px] text-muted-foreground uppercase font-bold">Prazo: {service.deadline}</span>
                                            </div>
                                            <span className={`px-3 py-1 ${service.bg} ${service.color} font-bold text-[9px] rounded-full uppercase`}>
                                                {service.status}
                                            </span>
                                            <Button 
                                                size="icon" 
                                                variant="ghost" 
                                                onClick={() => setExpandedServiceId(expandedServiceId === service.id ? null : service.id)}
                                                className={`h-8 w-8 rounded-lg border border-white/5 hover:bg-white/5 text-primary transition-transform ${expandedServiceId === service.id ? 'rotate-90' : ''}`}
                                            >
                                                <ChevronRight className="w-4 h-4" />
                                            </Button>
                                            </div>
                                        </div>
                                        
                                        {expandedServiceId === service.id && (
                                            <div className="px-4 pb-4 animate-in slide-in-from-top-2 duration-300">
                                                <div className="pt-4 border-t border-white/5 grid grid-cols-1 md:grid-cols-2 gap-6">
                                                    <div className="space-y-4">
                                                        <div className="space-y-2">
                                                            <div className="text-[8px] font-black uppercase text-muted-foreground italic">Detalhes do Serviço</div>
                                                            <p className="text-[10px] text-white/70 leading-relaxed">
                                                                Solicitação de {service.title.toLowerCase()} para projeto de alto padrão. Requer profissional com experiência e ferramentas completas.
                                                            </p>
                                                        </div>
                                                        
                                                        <div className="space-y-3">
                                                            <div className="text-[8px] font-black uppercase text-muted-foreground italic flex items-center gap-2">
                                                                <Clock className="w-2.5 h-2.5" /> Linha do Tempo / Histórico
                                                            </div>
                                                            <div className="space-y-3 pl-2 border-l border-white/10">
                                                                <div className="relative pl-4">
                                                                    <div className="absolute left-[-5px] top-1 w-2 h-2 rounded-full bg-primary" />
                                                                    <div className="text-[9px] font-black text-white uppercase italic">Status alterado para {service.status}</div>
                                                                    <div className="text-[7px] text-muted-foreground uppercase font-bold">Hoje às 14:30 • Por Sistema</div>
                                                                </div>
                                                                <div className="relative pl-4">
                                                                    <div className="absolute left-[-5px] top-1 w-2 h-2 rounded-full bg-white/20" />
                                                                    <div className="text-[9px] font-black text-white/50 uppercase italic">OS Criada</div>
                                                                    <div className="text-[7px] text-muted-foreground/50 uppercase font-bold">10/07 às 09:15 • Por Marcenaria Inovamad</div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <div className="flex flex-col gap-3 justify-end items-end">
                                                        <div className="w-full p-3 rounded-xl bg-white/5 border border-white/5">
                                                            <div className="text-[8px] font-black uppercase text-muted-foreground italic mb-2">Ações Rápidas</div>
                                                        <div className="flex gap-2">
                                                            <Link 
                                                                to="/_authenticated/feed" 
                                                                search={{ context: service.id }}
                                                                className="flex-1 flex items-center justify-center gap-2 bg-white/5 hover:bg-white/10 text-white text-[9px] font-bold uppercase italic border border-white/10 px-3 py-2.5 rounded-lg transition-all"
                                                            >
                                                                <Info className="w-3 h-3" /> Ver Detalhes
                                                            </Link>
                                                            <Button 
                                                                onClick={() => exportToPDF(service)}
                                                                className="flex-1 flex items-center justify-center gap-2 bg-white/5 hover:bg-white/10 text-white text-[9px] font-bold uppercase italic border border-white/10 px-3 py-2.5 rounded-lg transition-all h-auto"
                                                            >
                                                                <Download className="w-3 h-3" /> PDF
                                                            </Button>
                                                            <Button size="sm" className="flex-1 bg-primary text-black text-[9px] font-black uppercase italic h-10 rounded-lg shadow-[0_0_15px_rgba(0,255,135,0.2)]">Avançar Status</Button>
                                                        </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )) : (
                                    <div className="py-8 text-center text-muted-foreground text-xs uppercase font-bold italic">
                                        Nenhuma solicitação encontrada
                                    </div>
                                )}

                                {totalPages > 1 && (
                                    <div className="flex items-center justify-center gap-2 mt-4">
                                        <Button 
                                            size="sm" 
                                            variant="ghost" 
                                            disabled={currentPage === 1}
                                            onClick={() => setCurrentPage(prev => prev - 1)}
                                            className="h-8 text-[9px] uppercase font-black"
                                        >
                                            Anterior
                                        </Button>
                                        <span className="text-[9px] font-black text-white px-2">
                                            Página {currentPage} de {totalPages}
                                        </span>
                                        <Button 
                                            size="sm" 
                                            variant="ghost" 
                                            disabled={currentPage === totalPages}
                                            onClick={() => setCurrentPage(prev => prev + 1)}
                                            className="h-8 text-[9px] uppercase font-black"
                                        >
                                            Próxima
                                        </Button>
                                    </div>
                                )}
                            </>
                        );
                    })()}
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

function ProfileView({ setIsProfileComplete, rating, getRatingColor, setRating }: { setIsProfileComplete: (complete: boolean) => void; rating: number; getRatingColor: (val: number) => string; setRating: (rating: number) => void }) {
    const [cnpj, setCnpj] = useState("");
    const [whatsapp, setWhatsapp] = useState("");
    const [phone, setPhone] = useState("");
    const [cep, setCep] = useState("");
    const [activityBranch, setActivityBranch] = useState("");
    const [logoUrl, setLogoUrl] = useState<string | null>(null);
    const [bannerUrl, setBannerUrl] = useState<string | null>(null);
    const [galleryUrls, setGalleryUrls] = useState<string[]>([]);
    const [videoUrls, setVideoUrls] = useState<string[]>([]);
    const [isDraggingOver, setIsDraggingOver] = useState(false);

    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    const handleDragEnd = (event: any, type: 'gallery' | 'video') => {
        const { active, over } = event;
        if (active.id !== over.id) {
            if (type === 'gallery') {
                setGalleryUrls((items) => {
                    const oldIndex = items.indexOf(active.id);
                    const newIndex = items.indexOf(over.id);
                    return arrayMove(items, oldIndex, newIndex);
                });
            } else {
                setVideoUrls((items) => {
                    const oldIndex = items.indexOf(active.id);
                    const newIndex = items.indexOf(over.id);
                    return arrayMove(items, oldIndex, newIndex);
                });
            }
            toast.success("Ordem atualizada!");
            saveMediaOrder(type);
        }
    };

    const saveMediaOrder = async (type: 'gallery' | 'video') => {
        try {
            const { data: { user } } = await supabaseExternal.auth.getUser();
            if (!user) return;

            const updateData = type === 'gallery' ? { gallery_order: galleryUrls } : { video_order: videoUrls };
            console.log('Salvando ordem no banco:', updateData);
            
            const { error } = await supabaseExternal
                .from('user_profiles')
                .update(updateData)
                .eq('user_id', user.id);

            if (error) throw error;
        } catch (err) {
            console.error('Erro ao salvar ordem:', err);
        }
    };

    
    const { uploadFile, isUploading, uploadProgress } = useMediaUpload();

    useEffect(() => {
        const loadMediaOrder = async () => {
            try {
                const { data: { user } } = await supabaseExternal.auth.getUser();
                if (!user) return;

                const { data, error } = await supabaseExternal
                    .from('user_profiles')
                    .select('gallery_order, video_order')
                    .eq('user_id', user.id)
                    .single();

                if (error) throw error;
                if (data.gallery_order) setGalleryUrls(data.gallery_order);
                if (data.video_order) setVideoUrls(data.video_order);
            } catch (err) {
                console.error('Erro ao carregar ordem:', err);
            }
        };
        loadMediaOrder();
    }, []);

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
        const cleanCep = cep.replace(/\D/g, '');
        if (cleanCep.length === 8) {
            handleCepLookup(cleanCep);
        }
    }, [cep]);

    const handleCepLookup = async (cleanCep: string) => {
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

    const [cropImage, setCropImage] = useState<string | null>(null);
    const [cropType, setCropType] = useState<'logo' | 'banner' | 'gallery' | 'video' | null>(null);

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'logo' | 'banner' | 'gallery' | 'video') => {
        const files = Array.from(e.target.files || []);
        if (files.length === 0) return;

        // Limite para galeria
        if (type === 'gallery' && (galleryUrls.length + files.length) > 12) {
            toast.error("Limite da Galeria", {
                description: "Você pode ter no máximo 12 fotos na galeria."
            });
            return;
        }

        for (const file of files) {
            // Validações
            const isVideo = type === 'video';
            const maxSize = isVideo ? 50 * 1024 * 1024 : 5 * 1024 * 1024; // 50MB video, 5MB image
            const allowedTypes = isVideo ? ['video/mp4', 'video/quicktime'] : ['image/jpeg', 'image/png', 'image/webp'];

            if (!allowedTypes.includes(file.type)) {
                toast.error("Formato inválido", {
                    description: `${file.name} não é um formato suportado (${allowedTypes.join(', ')}).`
                });
                continue;
            }

            if (file.size > maxSize) {
                toast.error("Arquivo muito grande", {
                    description: `${file.name} excede o limite de ${maxSize / (1024 * 1024)}MB.`
                });
                continue;
            }

            // Preview para Logo
            if (type === 'logo' && !cropImage) {
                const reader = new FileReader();
                reader.onload = () => {
                    setCropImage(reader.result as string);
                    setCropType('logo');
                };
                reader.readAsDataURL(file);
                return;
            }

            const folder = type === 'video' ? 'videos' : type === 'gallery' ? 'gallery' : 'branding';
            const url = await uploadFile(file, 'media', folder);
            
            if (url) {
                if (type === 'logo') setLogoUrl(url);
                else if (type === 'banner') setBannerUrl(url);
                else if (type === 'gallery') setGalleryUrls(prev => [...prev, url]);
                else if (type === 'video') setVideoUrls(prev => [...prev.slice(-2), url]);
                
                toast.success("Upload realizado!", {
                    description: `${file.name} enviado com sucesso.`
                });
            }
        }
        
        // Limpar input
        e.target.value = '';
    };

    const confirmRemoval = (type: string, onConfirm: () => void) => {
        toast("Confirmar Remoção", {
            description: `Tem certeza que deseja remover este ${type}?`,
            action: {
                label: "Remover",
                onClick: onConfirm,
            },
            cancel: {
                label: "Cancelar",
                onClick: () => {},
            },
            duration: 5000,
        });
    };

    const handleDrop = async (e: React.DragEvent, type: 'gallery' | 'video') => {
        e.preventDefault();
        setIsDraggingOver(false);
        const files = Array.from(e.dataTransfer.files);
        if (files.length > 0) {
            const mockEvent = { target: { files } } as unknown as React.ChangeEvent<HTMLInputElement>;
            handleFileUpload(mockEvent, type);
        }
    };

    return (
        <div className="max-w-4xl mx-auto space-y-6 md:space-y-8 animate-in fade-in duration-500 pb-20">
            {isUploading && (
                <div className="fixed bottom-10 right-10 z-[100] w-72 bg-[#1A1A1B] border border-primary/30 p-4 rounded-2xl shadow-2xl animate-in slide-in-from-right duration-300">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary">
                            <Activity className="w-4 h-4 animate-spin" />
                        </div>
                        <span className="text-[10px] font-black uppercase text-white italic">Enviando Arquivos...</span>
                    </div>
                    {uploadProgress.map((p, i) => (
                        <div key={i} className="space-y-1 mb-2 last:mb-0">
                            <div className="flex justify-between text-[8px] font-bold text-muted-foreground uppercase">
                                <span className="truncate max-w-[150px]">{p.fileName}</span>
                                <span>{p.progress}%</span>
                            </div>
                            <Progress value={p.progress} className="h-1 bg-white/5" />
                        </div>
                    ))}
                </div>
            )}
            <div className="bg-[#1A1A1B] border border-white/10 p-5 md:p-8 rounded-2xl md:rounded-3xl space-y-6 md:space-y-8 shadow-2xl">
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
                           <IMaskInput
                             mask="00.000.000/0000-00"
                             value={cnpj}
                             onAccept={(value) => setCnpj(value)}
                             required 
                             placeholder="00.000.000/0001-00" 
                             className="flex h-12 w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 focus:border-primary/50 transition-all" 
                           />
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
                           <IMaskInput
                             mask="(00) 00000-0000"
                             value={whatsapp}
                             onAccept={(value) => setWhatsapp(value)}
                             required 
                             placeholder="(11) 99999-9999" 
                             className="flex h-12 w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 focus:border-[#25D366]/50 transition-all" 
                           />
                        </div>
                        <div className="space-y-2">
                           <Label className="uppercase font-bold text-[10px] text-muted-foreground tracking-widest flex items-center gap-2">
                             <Phone className="w-3 h-3 text-blue-400" /> Telefone Fixo (Opcional)
                           </Label>
                           <IMaskInput
                             mask="(00) 0000-0000"
                             value={phone}
                             onAccept={(value) => setPhone(value)}
                             placeholder="(11) 4000-0000" 
                             className="flex h-12 w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 focus:border-blue-400/50 transition-all" 
                           />
                        </div>
                    </div>
                 </div>

                  <div className="space-y-6 pt-6 border-t border-white/5">
                    <ActivitySelect value={activityBranch} onChange={setActivityBranch} />

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
                           <IMaskInput 
                             mask="00000-000"
                             value={cep}
                             onAccept={(value) => setCep(value)}
                             required
                             placeholder="00000-000" 
                             className="flex h-12 w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 focus:border-primary/50 transition-all" 
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
                            <div className="relative h-40 group">
                                <label className="h-full w-full rounded-3xl border-2 border-dashed border-white/10 flex flex-col items-center justify-center gap-3 hover:border-primary/50 transition-all cursor-pointer bg-black/20 overflow-hidden shadow-inner block">
                                    <input type="file" className="hidden" accept="image/*" onChange={(e) => handleFileUpload(e, 'logo')} />
                                    {logoUrl ? (
                                        <img src={logoUrl} alt="Logo" className="w-full h-full object-contain p-4" />
                                    ) : (
                                        <>
                                            <PlusCircle className="w-8 h-8 text-muted-foreground group-hover:text-primary transition-colors" />
                                            <span className="text-[10px] font-black uppercase text-muted-foreground group-hover:text-primary transition-colors">Upload Logo</span>
                                        </>
                                    )}
                                    <div className="absolute inset-0 bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                                </label>
                                {logoUrl && (
                                    <button 
                                        onClick={() => confirmRemoval('Logo', () => setLogoUrl(null))}
                                        className="absolute top-2 right-2 p-1.5 bg-red-500 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity z-10"
                                    >
                                        <Trash2 className="w-3 h-3 text-white" />
                                    </button>
                                )}
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label className="uppercase font-bold text-[10px] text-muted-foreground tracking-widest">Banner da Empresa</Label>
                            <div className="relative h-40 group">
                                <label className="h-full w-full rounded-3xl border-2 border-dashed border-white/10 flex flex-col items-center justify-center gap-3 hover:border-primary/50 transition-all cursor-pointer bg-black/20 overflow-hidden shadow-inner block">
                                    <input type="file" className="hidden" accept="image/*" onChange={(e) => handleFileUpload(e, 'banner')} />
                                    {bannerUrl ? (
                                        <img src={bannerUrl} alt="Banner" className="w-full h-full object-cover" />
                                    ) : (
                                        <>
                                            <PlusCircle className="w-8 h-8 text-muted-foreground group-hover:text-primary transition-colors" />
                                            <span className="text-[10px] font-black uppercase text-muted-foreground group-hover:text-primary transition-colors">Upload Banner</span>
                                        </>
                                    )}
                                    <div className="absolute inset-0 bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                                </label>
                                {bannerUrl && (
                                    <button 
                                        onClick={() => confirmRemoval('Banner', () => setBannerUrl(null))}
                                        className="absolute top-2 right-2 p-1.5 bg-red-500 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity z-10"
                                    >
                                        <Trash2 className="w-3 h-3 text-white" />
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                    
                    {cropImage && (
                        <div className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-md flex items-center justify-center p-4">
                            <div className="bg-[#1A1A1B] border border-white/10 rounded-3xl p-6 md:p-8 max-w-xl w-full space-y-6">
                                <div className="flex justify-between items-center">
                                    <h3 className="text-sm font-black text-white uppercase italic">Ajustar Imagem</h3>
                                    <button onClick={() => setCropImage(null)} className="text-muted-foreground hover:text-white"><X className="w-5 h-5" /></button>
                                </div>
                                <div className="aspect-square bg-black/40 rounded-2xl overflow-hidden border border-white/5 relative flex items-center justify-center">
                                    <img src={cropImage} alt="Crop preview" className="max-w-full max-h-full" />
                                    <div className="absolute inset-0 border-2 border-primary border-dashed opacity-50 pointer-events-none rounded-full m-4" />
                                </div>
                                <div className="flex gap-4">
                                    <Button variant="ghost" onClick={() => setCropImage(null)} className="flex-1 uppercase font-bold">Cancelar</Button>
                                    <Button 
                                        onClick={async () => {
                                            // Simular crop/ajuste e salvar
                                            const file = await (await fetch(cropImage)).blob();
                                            const folder = cropType === 'video' ? 'videos' : cropType === 'gallery' ? 'gallery' : 'branding';
                                            const url = await uploadFile(new File([file], 'cropped.png', { type: 'image/png' }), 'media', folder);
                                            if (url) {
                                                if (cropType === 'logo') setLogoUrl(url);
                                                setCropImage(null);
                                                toast.success("Logo ajustado com sucesso!");
                                            }
                                        }}
                                        className="flex-1 bg-primary text-black uppercase font-black"
                                    >
                                        <Crop className="w-4 h-4 mr-2" /> Salvar Ajuste
                                    </Button>
                                </div>
                            </div>
                        </div>
                    )}
                    
                    {uploadProgress.length > 0 && (
                        <div className="space-y-3 p-4 rounded-2xl bg-white/5 border border-white/10 animate-in fade-in slide-in-from-top-2">
                            <div className="text-[10px] font-black uppercase text-primary italic">Status do Upload</div>
                            {uploadProgress.map((p, i) => (
                                <div key={i} className="space-y-1">
                                    <div className="flex justify-between text-[8px] font-bold text-muted-foreground uppercase">
                                        <span>{p.fileName}</span>
                                        <span>{p.progress}%</span>
                                    </div>
                                    <Progress value={p.progress} className="h-1 bg-white/5" />
                                </div>
                            ))}
                        </div>
                    )}
                    
                    <div className="space-y-4">
                        <Label className="uppercase font-bold text-[10px] text-muted-foreground tracking-widest flex items-center justify-between">
                            Galeria de Fotos da Empresa (Arraste para Reordenar)
                            <span className="text-[8px] opacity-50">{galleryUrls.length}/12</span>
                        </Label>
                        
                        <DndContext 
                            sensors={sensors}
                            collisionDetection={closestCenter}
                            onDragEnd={(e) => handleDragEnd(e, 'gallery')}
                        >
                            <div 
                                className={`grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 p-4 rounded-3xl border-2 border-dashed transition-all ${isDraggingOver ? 'border-primary bg-primary/5' : 'border-white/10 bg-black/20'}`}
                                onDragOver={(e) => { e.preventDefault(); setIsDraggingOver(true); }}
                                onDragLeave={() => setIsDraggingOver(false)}
                                onDrop={(e) => handleDrop(e, 'gallery')}
                            >
                                <SortableContext items={galleryUrls} strategy={rectSortingStrategy}>
                                    {galleryUrls.map((url) => (
                                        <SortableItem key={url} id={url} onRemove={() => confirmRemoval('foto', () => setGalleryUrls(prev => prev.filter(u => u !== url)))} />
                                    ))}
                                </SortableContext>
                                
                                {galleryUrls.length < 12 && (
                                    <label className="aspect-square rounded-2xl border border-white/5 bg-white/5 flex flex-col items-center justify-center gap-2 hover:bg-white/10 transition-all cursor-pointer group">
                                        <input type="file" className="hidden" accept="image/*" multiple onChange={(e) => handleFileUpload(e, 'gallery')} />
                                        <PlusCircle className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
                                        <span className="text-[8px] font-black uppercase text-muted-foreground group-hover:text-primary tracking-tighter">Add Foto</span>
                                    </label>
                                )}
                            </div>
                        </DndContext>
                    </div>

                    <div className="space-y-4 pt-6 border-t border-white/5">
                        <Label className="uppercase font-bold text-[10px] text-muted-foreground tracking-widest flex items-center justify-between">
                            Vídeos da Empresa (Até 3 vídeos)
                            <span className="text-[8px] opacity-50">{videoUrls.length}/3</span>
                        </Label>
                        
                        <DndContext 
                            sensors={sensors}
                            collisionDetection={closestCenter}
                            onDragEnd={(e) => handleDragEnd(e, 'video')}
                        >
                            <div 
                                className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 rounded-3xl border-2 border-dashed border-white/10 bg-black/20"
                                onDragOver={(e) => e.preventDefault()}
                                onDrop={(e) => handleDrop(e, 'video')}
                            >
                                <SortableContext items={videoUrls} strategy={rectSortingStrategy}>
                                    {videoUrls.map((url) => (
                                        <SortableItem key={url} id={url} isVideo onRemove={() => confirmRemoval('vídeo', () => setVideoUrls(prev => prev.filter(u => u !== url)))} />
                                    ))}
                                </SortableContext>
                                
                                {videoUrls.length < 3 && (
                                    <label className="aspect-video sm:aspect-square rounded-2xl border border-white/5 bg-white/5 flex flex-col items-center justify-center gap-2 hover:bg-white/10 transition-all cursor-pointer group">
                                        <input type="file" className="hidden" accept="video/mp4,video/quicktime" multiple onChange={(e) => handleFileUpload(e, 'video')} />
                                        <Video className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
                                        <span className="text-[8px] font-black uppercase text-muted-foreground group-hover:text-primary tracking-tighter">Add Vídeo</span>
                                    </label>
                                )}
                            </div>
                        </DndContext>
                    </div>

                 </div>

                  <div className="pt-6 border-t border-white/5 flex flex-col md:flex-row gap-4 items-center justify-between">
                    <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/10">
                        <Star className={`w-4 h-4 ${getRatingColor(rating).replace('drop-shadow-', '')} fill-current`} />
                        <span className="text-xs font-black text-white italic">Reputação Atual: <span className={getRatingColor(rating)}>{rating.toFixed(1)} / 5.0</span></span>
                    </div>

                    <Button 
                        onClick={() => {
                            setIsProfileComplete(true);
                            toast.info("Dados Salvos com Sucesso", {
                                description: "As informações da sua empresa foram atualizadas e a dashboard completa foi liberada.",
                            });
                            // Pequeno delay para permitir ver o toast antes de voltar
                            setTimeout(() => {
                               window.dispatchEvent(new CustomEvent('change-tab', { detail: 'dashboard' }));
                            }, 800);
                        }}
                        className="w-full md:w-auto px-12 bg-primary text-black font-black uppercase italic tracking-widest hover:bg-primary/90 h-14 rounded-2xl shadow-[0_0_30px_rgba(0,255,135,0.2)] transition-all active:scale-[0.98]"
                    >
                        Salvar Todas as Alterações
                    </Button>
                 </div>
            </div>
        </div>
    );
}

function SortableItem({ id, isVideo, onRemove }: { id: string; isVideo?: boolean; onRemove: () => void }) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging
    } = useSortable({ id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        zIndex: isDragging ? 50 : 0,
        opacity: isDragging ? 0.5 : 1
    };

    return (
        <div 
            ref={setNodeRef} 
            style={style} 
            className={`relative rounded-2xl overflow-hidden border border-white/10 bg-black/40 group touch-none \${isVideo ? 'aspect-video sm:aspect-square' : 'aspect-square'}`}
        >
            <div {...attributes} {...listeners} className="w-full h-full cursor-grab active:cursor-grabbing">
                {isVideo ? (
                    <video src={id} className="w-full h-full object-cover" />
                ) : (
                    <img src={id} alt="Gallery" className="w-full h-full object-cover" />
                )}
            </div>
            <button 
                onClick={(e) => { e.stopPropagation(); onRemove(); }}
                className="absolute top-1.5 right-1.5 p-1 bg-red-500 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity z-10"
            >
                <Trash2 className="w-2.5 h-2.5 text-white" />
            </button>
            <div className="absolute inset-0 bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
        </div>
    );
}


function MetricCard({ label, value, icon, color, subValue }: any) {
    return (
        <div className="bg-[#1A1A1B] border border-white/10 p-4 md:p-6 rounded-2xl md:rounded-3xl space-y-1 md:space-y-2 relative overflow-hidden group hover:border-primary/30 transition-all flex flex-col justify-between">
            <div>
                <div className={`${color} opacity-80 mb-1 md:mb-2 group-hover:scale-110 transition-transform`}>{icon}</div>
                <div className="text-[9px] md:text-xs font-bold text-muted-foreground uppercase tracking-wider">{label}</div>
                <div className="text-lg md:text-2xl font-black text-white italic truncate">{value}</div>
            </div>
            {subValue}
            <div className={`absolute top-0 right-0 w-12 h-12 ${color} opacity-[0.03] -mr-6 -mt-6 rounded-full`} />
        </div>
    )
}
