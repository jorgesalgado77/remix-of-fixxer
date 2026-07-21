import { createFileRoute, Link } from "@tanstack/react-router";
import { usePerformanceMode } from "@/hooks/use-performance-mode";
import { 
  Briefcase, 
  MapPin, 
  Star, 
  CheckCircle2, 
  Clock, 
  DollarSign, 
  MessageSquare, 
  User, 
  ChevronRight,
  TrendingUp,
  ShieldCheck,
  PlusCircle,
  Camera
} from "lucide-react";
import { useState } from "react";
import { ReviewModal } from "@/components/ReviewModal";
import { EscrowBadge } from "@/components/EscrowBadge";


export const Route = createFileRoute("/_authenticated/prestador")({
  component: PrestadorDashboard,
});

function PrestadorDashboard() {
  const { glassClass } = usePerformanceMode();

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-8 pb-24 animate-in fade-in duration-500">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white uppercase italic tracking-tighter flex items-center gap-2">
            <User className="w-6 h-6 text-[#00FF87]" />
            MEU <span className="text-[#00FF87]">PAINEL</span>
          </h1>
          <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">Controle de Agendas, O.S. e Reputação</p>
        </div>
        <Link to="/_authenticated/feed" className="flex items-center gap-2 px-6 py-3 rounded-xl bg-[#00FF87] text-black font-black uppercase italic text-xs tracking-widest hover:shadow-[0_0_20px_rgba(0,255,135,0.4)] transition-all">
          <Briefcase className="w-4 h-4" /> Ver Oportunidades
        </Link>
      </header>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard icon={<Briefcase className="w-5 h-5" />} label="Ativos" value="3" color="text-blue-400" />
        <StatCard icon={<CheckCircle2 className="w-5 h-5" />} label="Concluídos" value="128" color="text-[#00FF87]" />
        <StatCard icon={<Star className="w-5 h-5" />} label="Rating" value="4.9" color="text-amber-400" />
        <StatCard icon={<DollarSign className="w-5 h-5" />} label="Saldo" value="R$ 2.4k" color="text-emerald-400" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className={`lg:col-span-2 space-y-6`}>
          <div className={`${glassClass} border border-white/5 rounded-3xl p-6`}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-sm font-black text-white uppercase italic flex items-center gap-2">
                <Clock className="w-5 h-5 text-primary" /> Trabalhos em Andamento
              </h2>
            </div>
            <div className="space-y-4">
              <JobCard id="OS-2490" client="Loja Móveis Premium" category="Montagem" value="R$ 450,00" status="Em Execução" />
              <JobCard id="OS-2512" client="Carlos Silva (Residencial)" category="Elétrica" value="R$ 180,00" status="Aguardando" />
            </div>
          </div>

          <div className={`${glassClass} border border-white/5 rounded-3xl p-6`}>
             <h2 className="text-sm font-black text-white uppercase italic mb-6">Minha Vitrine (Público)</h2>
             <div className="p-4 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-between">
                <div className="flex items-center gap-3">
                   <div className="w-12 h-12 rounded-xl bg-[#00FF87]/20 flex items-center justify-center text-[#00FF87] font-black italic">M</div>
                   <div>
                      <span className="text-xs font-black text-white uppercase italic">Montador Especialista em Planejados</span>
                      <div className="flex items-center gap-2 mt-1">
                         <span className="text-[8px] font-bold text-[#00FF87] uppercase">Ativo no Feed</span>
                         <span className="text-[8px] text-muted-foreground uppercase">• 1.2k visualizações</span>
                      </div>
                   </div>
                </div>
                <button className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-[9px] font-bold uppercase tracking-widest hover:bg-white/10 transition-all">Editar Anúncio</button>
             </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className={`${glassClass} border border-white/5 rounded-3xl p-6`}>
            <h2 className="text-sm font-black text-white uppercase italic mb-4 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" /> Pagamento em Custódia Protegida FIXXER
            </h2>
            <div className="mb-4">
              <EscrowBadge />
            </div>
            <p className="text-[10px] text-muted-foreground font-medium mb-4 italic">
              O saldo de <span className="text-white font-bold tracking-tighter">R$ 1.250,00</span> está retido e será liberado após o upload da foto de conclusão.
            </p>
            <button className="w-full py-3 rounded-xl bg-[#00FF87]/10 border border-[#00FF87]/20 text-[9px] font-black text-[#00FF87] uppercase tracking-widest flex items-center justify-center gap-2">
              <Camera className="w-3.5 h-3.5" /> Enviar Comprovação Final
            </button>
          </div>

          <div className={`${glassClass} border border-white/5 rounded-3xl p-6`}>
            <h2 className="text-sm font-black text-white uppercase italic mb-4 flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-blue-400" /> Novas Mensagens
            </h2>
            <div className="space-y-4">
              <div className="p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-colors cursor-pointer border border-white/5">
                 <span className="text-[10px] font-black text-white uppercase block">Loja ABC Móveis</span>
                 <p className="text-[9px] text-muted-foreground italic line-clamp-1 mt-1">"Consegue atender amanhã às 14h?"</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, color }: any) {
  return (
    <div className="bg-black/40 border border-white/5 p-4 rounded-2xl flex flex-col gap-1 relative overflow-hidden">
      <div className={`w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center ${color} mb-2`}>{icon}</div>
      <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">{label}</span>
      <span className="text-xl font-black text-white italic">{value}</span>
      <div className={`absolute -right-2 -bottom-2 opacity-5 ${color} scale-150`}>{icon}</div>
    </div>
  );
}

function JobCard({ id, client, category, value, status }: any) {
  return (
    <div className="flex items-center justify-between p-4 rounded-2xl bg-white/5 border border-white/5 hover:border-primary/30 transition-all">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-black/40 border border-white/5 flex items-center justify-center text-[10px] font-black text-primary italic">OS</div>
        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-black text-white uppercase italic">{id}</span>
            <span className="text-[8px] font-bold px-1.5 py-0.5 rounded bg-white/10 text-muted-foreground uppercase">{category}</span>
          </div>
          <span className="text-[10px] text-muted-foreground">{client}</span>
        </div>
      </div>
      <div className="flex items-center gap-4">
        <div className="text-right">
          <span className="text-[8px] font-bold text-muted-foreground uppercase block">Valor</span>
          <span className="text-[10px] font-black text-white">{value}</span>
        </div>
        <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-black text-[9px] font-black uppercase italic">
          Ver <ChevronRight className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
}