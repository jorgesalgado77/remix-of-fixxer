import { Link } from "@tanstack/react-router";
import { useState } from "react";
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
  Info
} from "lucide-react";
import { usePerformanceMode } from "@/hooks/use-performance-mode";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { EscrowBadge } from "@/components/EscrowBadge";

export function LojistaDashboard() {
  const [activeTab, setActiveTab] = useState("dashboard");
  const { glassClass } = usePerformanceMode();

  return (
    <div className="flex h-screen bg-black overflow-hidden font-sans text-white">
      {/* Sidebar Retrátil */}
      <aside className="w-64 border-r border-white/10 p-6 flex flex-col gap-8 hidden md:flex bg-[#0A0A0A]">
        <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center text-black font-black text-xl shadow-[0_0_15px_rgba(0,255,135,0.3)]">F</div>
            <h1 className="font-bold text-white tracking-tight uppercase italic">FIXXER</h1>
        </div>
        <nav className="flex flex-col gap-2">
            <SidebarButton icon={<Activity className="w-4 h-4"/>} label="Visão Geral" active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} />
            <SidebarButton icon={<PlusCircle className="w-4 h-4"/>} label="Criar Serviço" active={activeTab === 'create'} onClick={() => setActiveTab('create')} />
            <SidebarButton icon={<Building2 className="w-4 h-4"/>} label="Perfil Empresa" active={activeTab === 'profile'} onClick={() => setActiveTab('profile')} />
            <SidebarButton icon={<Star className="w-4 h-4"/>} label="Avaliações" active={activeTab === 'reviews'} onClick={() => setActiveTab('reviews')} />
        </nav>
        <div className="mt-auto pt-6 border-t border-white/10">
            <Link to="/_authenticated/feed" className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-white/5 transition-all text-muted-foreground hover:text-white font-medium text-sm">
                <Search className="w-4 h-4" /> Ir para o Feed
            </Link>
        </div>
      </aside>

      {/* Conteúdo Principal */}
      <main className="flex-1 overflow-y-auto scrollbar-none bg-[#050505]">
        <header className="px-8 py-6 border-b border-white/10 flex items-center justify-between sticky top-0 z-10 bg-[#050505]/80 backdrop-blur-md">
           <div className="flex items-center gap-4">
               <Button variant="ghost" className="md:hidden"><Menu/></Button>
               <h2 className="text-xl font-black text-white italic uppercase tracking-tighter">
                  {activeTab === 'dashboard' ? 'Painel Lojista' : activeTab === 'create' ? 'Publicar O.S.' : activeTab === 'profile' ? 'Perfil da Empresa' : 'Avaliações'}
               </h2>
           </div>
           <Button variant="ghost" size="sm" className="text-red-400 hover:text-red-300 font-bold uppercase text-xs italic">
             <LogOut className="w-4 h-4 mr-2" /> Sair
           </Button>
        </header>

        <div className="p-8 max-w-7xl mx-auto">
            {activeTab === 'dashboard' && <DashboardView />}
            {activeTab === 'create' && <CreateServiceView />}
            {activeTab === 'profile' && <ProfileView />}
        </div>
      </main>
    </div>
  );
}

function SidebarButton({ icon, label, active, onClick }: any) {
    return (
        <button 
            onClick={onClick}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all w-full text-sm font-black uppercase italic tracking-wider ${active ? 'bg-[#00FF87] text-black' : 'hover:bg-white/5 text-muted-foreground'}`}
        >
            {icon} {label}
        </button>
    );
}

function DashboardView() {
    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <MetricCard label="Serviços" value="12" icon={<Briefcase />} color="text-blue-400" />
                <MetricCard label="Pendentes" value="5" icon={<Clock />} color="text-amber-400" />
                <MetricCard label="Investimento" value="R$ 15.2k" icon={<DollarSign />} color="text-emerald-400" />
                <MetricCard label="Reputação" value="4.9 ⭐" icon={<Star />} color="text-[#00FF87]" />
            </div>
            
            <div className="bg-[#1A1A1B] border border-white/10 p-8 rounded-3xl">
                <div className="flex items-center justify-between mb-8">
                  <h3 className="font-black text-white uppercase italic">Últimas Solicitações</h3>
                  <div className="flex gap-2">
                     {['Hoje', '7 dias', '30 dias', 'Personalizado'].map(period => (
                       <button key={period} className="px-3 py-1 rounded-full text-[10px] font-bold uppercase bg-white/5 border border-white/5 hover:bg-[#00FF87] hover:text-black transition-colors">
                         {period}
                       </button>
                     ))}
                  </div>
                </div>
                
                <div className="space-y-4">
                    <div className="p-4 rounded-xl bg-black/40 border border-white/5 flex items-center justify-between">
                        <div>
                           <div className="text-xs font-black uppercase italic text-white">Montagem Dormitório</div>
                           <div className="text-[10px] text-muted-foreground uppercase tracking-wider">OS-2490 • São Paulo/SP</div>
                        </div>
                        <div className="flex items-center gap-4">
                           <span className="font-black text-xs text-white">R$ 450,00</span>
                           <span className="px-3 py-1 bg-[#00FF87]/10 text-[#00FF87] font-bold text-[10px] rounded-full uppercase">Concluído</span>
                        </div>
                    </div>
                    <div className="p-4 rounded-xl bg-black/40 border border-white/5 flex items-center justify-between">
                        <div>
                           <div className="text-xs font-black uppercase italic text-white">Medição Cozinha</div>
                           <div className="text-[10px] text-muted-foreground uppercase tracking-wider">OS-2491 • Campinas/SP</div>
                        </div>
                        <div className="flex items-center gap-4">
                           <span className="font-black text-xs text-white">R$ 200,00</span>
                           <span className="px-3 py-1 bg-amber-500/10 text-amber-500 font-bold text-[10px] rounded-full uppercase">Pendente</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

function CreateServiceView() {
    return (
        <div className="max-w-2xl bg-[#1A1A1B] border border-white/10 p-8 rounded-3xl space-y-6">
            <div className="space-y-2">
                <Label className="uppercase font-bold text-xs text-muted-foreground">Tipo de Profissional</Label>
                <Select>
                    <SelectTrigger className="bg-black/40 border-white/10">
                        <SelectValue placeholder="Selecione o parceiro..." />
                    </SelectTrigger>
                    <SelectContent className="bg-[#1A1A1B] border-white/10">
                        <SelectItem value="montador">Montador de Móveis</SelectItem>
                        <SelectItem value="conferente">Conferente Técnico</SelectItem>
                    </SelectContent>
                </Select>
            </div>
            
            <div className="space-y-2">
                <Label className="uppercase font-bold text-xs text-muted-foreground">Título do Serviço</Label>
                <Input placeholder="Ex: Medição técnica..." className="bg-black/40 border-white/10" />
            </div>

            <div className="space-y-2">
                <Label className="uppercase font-bold text-xs text-muted-foreground">Descrição</Label>
                <Textarea className="bg-black/40 border-white/10 min-h-[120px]" />
            </div>

            <Button className="w-full bg-[#00FF87] text-black font-black uppercase tracking-widest hover:bg-[#00FF87]/90 h-12">
                Publicar no Feed
            </Button>
        </div>
    )
}

function ProfileView() {
    return (
        <div className="bg-[#1A1A1B] border border-white/10 p-8 rounded-3xl space-y-6">
             <h3 className="font-black text-white uppercase italic">Dados Cadastrais</h3>
             <div className="grid grid-cols-2 gap-4">
                 <div className="space-y-2">
                    <Label className="uppercase font-bold text-xs text-muted-foreground">CEP</Label>
                    <Input placeholder="00000-000" className="bg-black/40 border-white/10" />
                 </div>
                 <div className="space-y-2">
                    <Label className="uppercase font-bold text-xs text-muted-foreground">Número</Label>
                    <Input placeholder="Ex: 123" className="bg-black/40 border-white/10" />
                 </div>
             </div>
             <Button className="bg-white/10 text-white font-bold uppercase italic hover:bg-white/20">Salvar Alterações</Button>
        </div>
    )
}

function MetricCard({ label, value, icon, color }: any) {
    return (
        <div className="bg-[#1A1A1B] border border-white/10 p-6 rounded-3xl space-y-2 relative overflow-hidden">
            <div className={`${color} opacity-80 mb-2`}>{icon}</div>
            <div className="text-xs font-bold text-muted-foreground uppercase">{label}</div>
            <div className="text-2xl font-black text-white italic">{value}</div>
        </div>
    )
}
