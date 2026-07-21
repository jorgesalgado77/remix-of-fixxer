import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
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
  DollarSign
} from "lucide-react";
import { usePerformanceMode } from "@/hooks/use-performance-mode";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/_authenticated/lojista")({
  component: LojistaDashboard,
});

function LojistaDashboard() {
  const [activeTab, setActiveTab] = useState("dashboard");
  const { glassClass } = usePerformanceMode();

  return (
    <div className="flex h-screen bg-black overflow-hidden">
      {/* Sidebar Retrátil */}
      <aside className="w-64 border-r border-white/10 p-6 flex flex-col gap-8 hidden md:flex bg-card/20">
        <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center text-primary-foreground font-black text-xl shadow-[0_0_15px_rgba(0,255,135,0.3)]">F</div>
            <h1 className="font-bold text-white tracking-tight">FIXXER</h1>
        </div>
        <nav className="flex flex-col gap-2">
            <SidebarButton icon={<Activity className="w-4 h-4"/>} label="Visão Geral" active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} />
            <SidebarButton icon={<PlusCircle className="w-4 h-4"/>} label="Criar Serviço" active={activeTab === 'create'} onClick={() => setActiveTab('create')} />
            <SidebarButton icon={<Building2 className="w-4 h-4"/>} label="Perfil da Empresa" active={activeTab === 'profile'} onClick={() => setActiveTab('profile')} />
            <SidebarButton icon={<Star className="w-4 h-4"/>} label="Avaliações" active={activeTab === 'reviews'} onClick={() => setActiveTab('reviews')} />
            <div className="mt-auto border-t border-white/10 pt-4">
                <Link to="/_authenticated/feed" className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-white/5 transition-all text-muted-foreground hover:text-white font-medium text-sm">
                    <Search className="w-4 h-4" /> Ir para o Feed
                </Link>
            </div>
        </nav>
      </aside>

      {/* Conteúdo Principal */}
      <main className="flex-1 overflow-y-auto scrollbar-none">
        <header className="px-8 py-6 border-b border-white/10 flex items-center justify-between bg-card/20 sticky top-0 z-10">
           <h2 className="text-xl font-black text-white italic uppercase tracking-tighter">
              {activeTab === 'dashboard' ? 'Painel Lojista' : activeTab === 'create' ? 'Publicar O.S.' : 'Perfil & Gestão'}
           </h2>
           <Button variant="ghost" size="sm" className="text-red-400 hover:text-red-300">
             <LogOut className="w-4 h-4 mr-2" /> Sair
           </Button>
        </header>

        <div className="p-8">
            {activeTab === 'dashboard' && <DashboardView />}
            {activeTab === 'create' && <CreateServiceView />}
        </div>
      </main>
    </div>
  );
}

function SidebarButton({ icon, label, active, onClick }: any) {
    return (
        <button 
            onClick={onClick}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all w-full text-sm font-bold ${active ? 'bg-[#00FF87] text-black' : 'hover:bg-white/5 text-muted-foreground'}`}
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
        </div>
    );
}

function MetricCard({ label, value, icon, color }: any) {
    return (
        <div className="bg-[#1A1A1B] border border-white/10 p-6 rounded-3xl space-y-2">
            <div className={`${color} opacity-80`}>{icon}</div>
            <div className="text-xs font-bold text-muted-foreground uppercase">{label}</div>
            <div className="text-2xl font-black text-white">{value}</div>
        </div>
    )
}

function CreateServiceView() {
    return (
        <div className="max-w-2xl bg-[#1A1A1B] border border-white/10 p-8 rounded-3xl space-y-6">
            <div className="space-y-4">
                <Label>Tipo de Profissional</Label>
                <Select>
                    <SelectTrigger className="bg-black/40 border-white/10">
                        <SelectValue placeholder="Selecione..." />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="montador">Montador de Móveis</SelectItem>
                        <SelectItem value="conferente">Conferente Técnico</SelectItem>
                    </SelectContent>
                </Select>
            </div>
            
            <div className="space-y-2">
                <Label>Título do Serviço</Label>
                <Input placeholder="Ex: Medição técnica..." className="bg-black/40 border-white/10" />
            </div>

            <div className="space-y-2">
                <Label>Descrição</Label>
                <Textarea className="bg-black/40 border-white/10 min-h-[120px]" />
            </div>

            <Button className="w-full bg-[#00FF87] text-black font-black uppercase tracking-widest hover:bg-[#00FF87]/90">
                Publicar no Feed
            </Button>
        </div>
    )
}
