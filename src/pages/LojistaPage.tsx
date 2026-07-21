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
            <div className="flex flex-col h-full p-8 space-y-8">
                <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center text-black font-black text-xl">F</div>
                        <h1 className="font-bold text-white tracking-tight uppercase italic">FIXXER</h1>
                    </div>
                    <button onClick={() => setMobileMenuOpen(false)} className="p-2 text-white">
                        <PlusCircle className="w-6 h-6 rotate-45" />
                    </button>
                </div>
                <nav className="flex flex-col gap-4">
                    <SidebarButton icon={<Activity className="w-5 h-5"/>} label="Visão Geral" active={activeTab === 'dashboard'} onClick={() => { setActiveTab('dashboard'); setMobileMenuOpen(false); }} />
                    <SidebarButton icon={<PlusCircle className="w-5 h-5"/>} label="Criar Serviço" active={activeTab === 'create'} onClick={() => { setActiveTab('create'); setMobileMenuOpen(false); }} />
                    <SidebarButton icon={<Building2 className="w-5 h-5"/>} label="Perfil Empresa" active={activeTab === 'profile'} onClick={() => { setActiveTab('profile'); setMobileMenuOpen(false); }} />
                    <SidebarButton icon={<Star className="w-5 h-5"/>} label="Avaliações" active={activeTab === 'reviews'} onClick={() => { setActiveTab('reviews'); setMobileMenuOpen(false); }} />
                </nav>
                <div className="mt-auto flex flex-col gap-4">
                    <Link to="/_authenticated/feed" onClick={() => setMobileMenuOpen(false)} className="flex items-center gap-3 px-4 py-4 rounded-2xl bg-white/5 border border-white/10 text-white font-black uppercase italic text-xs">
                        <Search className="w-4 h-4" /> Acessar Feed
                    </Link>
                    <Button variant="ghost" onClick={() => { /* Logout logic */ }} className="text-red-400 font-bold uppercase italic text-xs justify-start px-4">
                        <LogOut className="w-4 h-4 mr-2" /> Encerrar Sessão
                    </Button>
                </div>
            </div>
        </div>
      )}

      {/* Sidebar Retrátil (Desktop) */}
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
      <main className="flex-1 overflow-y-auto scrollbar-none bg-[#050505] pt-16 md:pt-0">
        <header className="px-8 py-6 border-b border-white/10 flex items-center justify-between sticky top-0 z-10 bg-[#050505]/80 backdrop-blur-md hidden md:flex">
           <div className="flex items-center gap-4">
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
            {activeTab === 'reviews' && <ReviewsView />}
        </div>
      </main>
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
        <div className="max-w-3xl animate-in slide-in-from-bottom duration-500">
          <div className="bg-[#1A1A1B] border border-white/10 p-8 rounded-3xl space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                    <Label className="uppercase font-bold text-[10px] text-muted-foreground tracking-widest">Tipo de Profissional</Label>
                    <Select>
                        <SelectTrigger className="bg-black/40 border-white/10 h-12 rounded-xl">
                            <SelectValue placeholder="Selecione o parceiro..." />
                        </SelectTrigger>
                        <SelectContent className="bg-[#1A1A1B] border-white/10">
                            <SelectItem value="montador">Montador de Móveis</SelectItem>
                            <SelectItem value="conferente">Conferente Técnico</SelectItem>
                            <SelectItem value="projetista">Projetista</SelectItem>
                            <SelectItem value="medidor">Medidor</SelectItem>
                            <SelectItem value="instalador">Instalador</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                <div className="space-y-2">
                    <Label className="uppercase font-bold text-[10px] text-muted-foreground tracking-widest">Título do Serviço</Label>
                    <Input placeholder="Ex: Medição Técnica Cozinha" className="bg-black/40 border-white/10 h-12 rounded-xl" />
                </div>
            </div>
            
            <div className="space-y-2">
                <Label className="uppercase font-bold text-[10px] text-muted-foreground tracking-widest">Descrição Detalhada</Label>
                <Textarea placeholder="Descreva as especificações técnicas..." className="bg-black/40 border-white/10 min-h-[150px] rounded-xl p-4" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                    <Label className="uppercase font-bold text-[10px] text-muted-foreground tracking-widest">Valor Contrato Final (R$)</Label>
                    <Input type="number" placeholder="20000.00" className="bg-black/40 border-white/10 h-12 rounded-xl" />
                </div>
                <div className="space-y-2">
                    <Label className="uppercase font-bold text-[10px] text-muted-foreground tracking-widest">Localização (Cidade/UF)</Label>
                    <Input placeholder="Ex: São Paulo/SP" className="bg-black/40 border-white/10 h-12 rounded-xl" />
                </div>
            </div>

            <Button className="w-full bg-[#00FF87] text-black font-black uppercase italic tracking-widest hover:bg-[#00FF87]/90 h-14 rounded-2xl shadow-[0_0_30px_rgba(0,255,135,0.2)]">
                Publicar Serviço no Feed
            </Button>
          </div>
        </div>
    )
}

function ProfileView() {
    return (
        <div className="max-w-4xl space-y-8 animate-in fade-in duration-500">
            <div className="bg-[#1A1A1B] border border-white/10 p-8 rounded-3xl space-y-8">
                 <div className="flex items-center gap-4 mb-4">
                     <div className="w-20 h-20 rounded-2xl bg-black/40 border border-white/10 flex items-center justify-center text-primary">
                         <Store className="w-10 h-10" />
                     </div>
                     <div>
                         <h3 className="font-black text-white uppercase italic text-lg">Perfil da Empresa</h3>
                         <p className="text-[10px] text-muted-foreground uppercase font-bold">Mantenha seus dados atualizados para gerar confiança.</p>
                     </div>
                 </div>

                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                     <div className="space-y-2">
                        <Label className="uppercase font-bold text-[10px] text-muted-foreground tracking-widest">Nome Fantasia</Label>
                        <Input placeholder="FIXXER Móveis Planejados" className="bg-black/40 border-white/10 h-12 rounded-xl" />
                     </div>
                     <div className="space-y-2">
                        <Label className="uppercase font-bold text-[10px] text-muted-foreground tracking-widest">Razão Social</Label>
                        <Input placeholder="FIXXER LTDA" className="bg-black/40 border-white/10 h-12 rounded-xl" />
                     </div>
                 </div>

                 <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                     <div className="space-y-2">
                        <Label className="uppercase font-bold text-[10px] text-muted-foreground tracking-widest">CEP</Label>
                        <Input placeholder="00000-000" className="bg-black/40 border-white/10 h-12 rounded-xl" />
                     </div>
                     <div className="md:col-span-2 space-y-2">
                        <Label className="uppercase font-bold text-[10px] text-muted-foreground tracking-widest">Endereço</Label>
                        <Input placeholder="Logradouro preenchido automaticamente" className="bg-black/40 border-white/10 h-12 rounded-xl" />
                     </div>
                 </div>

                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                     <div className="space-y-2">
                        <Label className="uppercase font-bold text-[10px] text-muted-foreground tracking-widest">E-mail de Contato</Label>
                        <Input type="email" placeholder="contato@fixxer.com.br" className="bg-black/40 border-white/10 h-12 rounded-xl" />
                     </div>
                     <div className="space-y-2">
                        <Label className="uppercase font-bold text-[10px] text-muted-foreground tracking-widest">WhatsApp / Telefone</Label>
                        <Input placeholder="(11) 99999-9999" className="bg-black/40 border-white/10 h-12 rounded-xl" />
                     </div>
                 </div>

                 <div className="space-y-4 pt-4 border-t border-white/5">
                    <h4 className="text-[10px] font-black uppercase italic text-muted-foreground tracking-widest">Identidade Visual</h4>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="h-32 rounded-2xl border-2 border-dashed border-white/10 flex flex-col items-center justify-center gap-2 hover:border-[#00FF87]/50 transition-colors cursor-pointer bg-black/20">
                            <PlusCircle className="w-6 h-6 text-muted-foreground" />
                            <span className="text-[8px] font-bold uppercase text-muted-foreground">Upload Logo</span>
                        </div>
                        <div className="h-32 rounded-2xl border-2 border-dashed border-white/10 flex flex-col items-center justify-center gap-2 hover:border-[#00FF87]/50 transition-colors cursor-pointer bg-black/20">
                            <PlusCircle className="w-6 h-6 text-muted-foreground" />
                            <span className="text-[8px] font-bold uppercase text-muted-foreground">Upload Banner</span>
                        </div>
                    </div>
                 </div>

                 <Button className="w-full md:w-auto px-12 bg-white/10 text-white font-black uppercase italic hover:bg-white/20 h-12 rounded-xl">
                    Salvar Alterações
                 </Button>
            </div>
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
