import { createFileRoute } from "@tanstack/react-router";
import { usePerformanceMode } from "@/hooks/use-performance-mode";
import { 
  Briefcase, 
  Store, 
  Users, 
  PlusCircle, 
  ChevronRight, 
  Clock, 
  DollarSign, 
  Package, 
  Activity, 
  Star,
  Search,
  Filter
} from "lucide-react";
import { useState } from "react";

export const Route = createFileRoute("/_authenticated/lojista")({
  component: LojistaDashboard,
});

function LojistaDashboard() {
  const { glassClass } = usePerformanceMode();

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-8 pb-24 animate-in fade-in duration-500">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white uppercase italic tracking-tighter flex items-center gap-2">
            <Store className="w-6 h-6 text-[#00FF87]" />
            PAINEL <span className="text-[#00FF87]">LOJISTA</span>
          </h1>
          <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">Gestão de Demandas Técnicas e O.S.</p>
        </div>
        <button className="flex items-center gap-2 px-6 py-3 rounded-xl bg-[#00FF87] text-black font-black uppercase italic text-xs tracking-widest hover:shadow-[0_0_20px_rgba(0,255,135,0.4)] transition-all">
          <PlusCircle className="w-4 h-4" /> Nova Demanda B2B
        </button>
      </header>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard icon={<Briefcase className="w-5 h-5" />} label="O.S. Ativas" value="12" color="text-blue-400" />
        <StatCard icon={<Clock className="w-5 h-5" />} label="Pendentes" value="5" color="text-amber-400" />
        <StatCard icon={<DollarSign className="w-5 h-5" />} label="Total Pago" value="R$ 15.2k" color="text-emerald-400" />
        <StatCard icon={<Star className="w-5 h-5" />} label="Reputação" value="4.8" color="text-[#00FF87]" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className={`lg:col-span-2 space-y-6`}>
          <div className={`${glassClass} border border-white/5 rounded-3xl p-6`}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-sm font-black text-white uppercase italic flex items-center gap-2">
                <Activity className="w-5 h-5 text-primary" /> Demandas em Aberto
              </h2>
              <button className="text-[10px] font-bold text-primary uppercase tracking-widest hover:underline">Ver Todas</button>
            </div>
            <div className="space-y-4">
               <DemandaItem id="OS-2490" title="Montagem Dormitório" city="São Paulo/SP" price="R$ 450,00" proposals={8} />
               <DemandaItem id="OS-2512" title="Conferência Técnica" city="Santo André/SP" price="R$ 150,00" proposals={3} />
               <DemandaItem id="OS-2520" title="Frete Dedicado" city="Campinas/SP" price="R$ 800,00" proposals={12} />
            </div>
          </div>

          <div className={`${glassClass} border border-white/5 rounded-3xl p-6`}>
             <h2 className="text-sm font-black text-white uppercase italic mb-6">Encontrar Novos Prestadores</h2>
             <div className={`flex items-center gap-3 p-3 rounded-xl border border-white/10 bg-black/40 mb-4`}>
                <Search className="w-4 h-4 text-muted-foreground" />
                <input placeholder="Ex: Montador em Guarulhos..." className="bg-transparent border-none outline-none text-xs text-white w-full font-medium" />
                <Filter className="w-4 h-4 text-muted-foreground cursor-pointer" />
             </div>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <PrestadorMiniCard name="Jorge Ricardo" specialty="Montagem" rating={5.0} city="SP" />
                <PrestadorMiniCard name="Carlos Silva" specialty="Elétrica" rating={4.8} city="SP" />
             </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className={`${glassClass} border border-white/5 rounded-3xl p-6`}>
             <h2 className="text-sm font-black text-white uppercase italic mb-4 flex items-center gap-2">
               <Package className="w-4 h-4 text-emerald-400" /> O.S. Concluídas
             </h2>
             <div className="space-y-3">
               <div className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/5">
                 <div className="flex flex-col">
                   <span className="text-[10px] font-black text-white uppercase italic">OS-2410</span>
                   <span className="text-[8px] text-muted-foreground uppercase">Concluída em 12/07</span>
                 </div>
                 <ChevronRight className="w-4 h-4 text-muted-foreground" />
               </div>
             </div>
          </div>
          
          <div className={`${glassClass} border border-white/5 rounded-3xl p-6 bg-gradient-to-br from-[#00FF87]/5 to-transparent`}>
             <h2 className="text-sm font-black text-white uppercase italic mb-2">Garantia FIXXER</h2>
             <p className="text-[10px] text-muted-foreground font-medium">Seu pagamento só é liberado ao profissional após a conclusão do serviço.</p>
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

function DemandaItem({ id, title, city, price, proposals }: any) {
  return (
    <div className="flex items-center justify-between p-4 rounded-2xl bg-white/5 border border-white/5 hover:border-primary/30 transition-all">
      <div className="flex flex-col">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-black text-white uppercase italic">{id}</span>
          <span className="text-[8px] font-bold px-1.5 py-0.5 rounded bg-primary/10 text-primary uppercase">{proposals} Propostas</span>
        </div>
        <span className="text-xs font-black text-white uppercase italic mt-1">{title}</span>
        <span className="text-[8px] text-muted-foreground uppercase tracking-widest">{city}</span>
      </div>
      <div className="flex items-center gap-4">
        <span className="text-[10px] font-black text-white">{price}</span>
        <button className="p-2 hover:bg-white/10 rounded-lg transition-colors">
          <ChevronRight className="w-4 h-4 text-muted-foreground" />
        </button>
      </div>
    </div>
  );
}

function PrestadorMiniCard({ name, specialty, rating, city }: any) {
  return (
    <div className="p-3 rounded-xl bg-white/5 border border-white/5 flex items-center gap-3 hover:border-primary/30 transition-all cursor-pointer">
       <div className="w-10 h-10 rounded-lg bg-black/40 border border-white/10 flex items-center justify-center text-primary font-black uppercase italic text-xs">{name.charAt(0)}</div>
       <div className="flex flex-col">
          <span className="text-[10px] font-black text-white uppercase italic">{name}</span>
          <div className="flex items-center gap-2">
             <span className="text-[8px] text-muted-foreground uppercase">{specialty}</span>
             <span className="text-[8px] font-black text-amber-500 flex items-center gap-0.5"><Star className="w-2 h-2 fill-current" /> {rating}</span>
          </div>
       </div>
    </div>
  );
}