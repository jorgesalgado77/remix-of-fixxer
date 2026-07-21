import { createFileRoute, Link } from "@tanstack/react-router";
import { usePerformanceMode } from "@/hooks/use-performance-mode";
import { 
  Store, 
  TrendingUp, 
  Package, 
  Users, 
  Truck, 
  DollarSign, 
  PlusCircle, 
  ChevronRight,
  Star,
  Activity,
  MessageSquare
} from "lucide-react";
import { useState } from "react";

export const Route = createFileRoute("/_authenticated/parceiro")({
  component: ParceiroDashboard,
});

function ParceiroDashboard() {
  const { glassClass } = usePerformanceMode();

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-8 pb-24 animate-in fade-in duration-500">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white uppercase italic tracking-tighter flex items-center gap-2">
            <Store className="w-6 h-6 text-[#00FF87]" />
            HUB <span className="text-[#00FF87]">PARCEIRO</span>
          </h1>
          <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">Gestão de Vitrine e Fornecimento B2B</p>
        </div>
        <Link to="/_authenticated/feed" className="flex items-center gap-2 px-6 py-3 rounded-xl bg-[#00FF87] text-black font-black uppercase italic text-xs tracking-widest hover:shadow-[0_0_20px_rgba(0,255,135,0.4)] transition-all">
          <TrendingUp className="w-4 h-4" /> Ver Feed B2B
        </Link>
      </header>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard icon={<Users className="w-5 h-5" />} label="Leads" value="24" color="text-blue-400" />
        <StatCard icon={<TrendingUp className="w-5 h-5" />} label="Vistas" value="1.2k" color="text-[#00FF87]" />
        <StatCard icon={<Package className="w-5 h-5" />} label="Produtos" value="12" color="text-emerald-400" />
        <StatCard icon={<DollarSign className="w-5 h-5" />} label="Vendas" value="R$ 8.4k" color="text-amber-400" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className={`lg:col-span-2 ${glassClass} border border-white/5 rounded-3xl p-6 space-y-6`}>
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-black text-white uppercase italic flex items-center gap-2">
              <Package className="w-5 h-5 text-primary" /> Minha Vitrine Ativa
            </h2>
            <button className="text-[10px] font-bold text-primary uppercase tracking-widest hover:underline">Ver Todos</button>
          </div>
          <div className="space-y-4">
            <ProductRow name="Cuba de Granito Premium" price="R$ 450,00" views={142} leads={8} />
            <ProductRow name="Kit Iluminação LED" price="R$ 120,00" views={89} leads={3} />
            <ProductRow name="Massa Plástica Industrial" price="R$ 35,00" views={245} leads={12} />
          </div>
        </div>

        <div className="space-y-6">
          <div className={`${glassClass} border border-white/5 rounded-3xl p-6`}>
            <h2 className="text-sm font-black text-white uppercase italic mb-4 flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-blue-400" /> Mensagens Recentes
            </h2>
            <div className="space-y-4">
              <MessageItem user="Loja Móveis Design" time="5 min atrás" text="Gostaria de saber sobre o prazo de entrega do granito..." />
              <MessageItem user="Carlos Montador" time="1h atrás" text="Você tem a massa plástica na cor cinza?" />
            </div>
          </div>
          <div className={`${glassClass} border border-white/5 rounded-3xl p-6 bg-gradient-to-br from-[#00FF87]/5 to-transparent`}>
             <h2 className="text-sm font-black text-white uppercase italic mb-2">Selo de Verificado</h2>
             <p className="text-[10px] text-muted-foreground font-medium mb-4">Aumente sua credibilidade enviando seus documentos comerciais.</p>
             <button className="w-full py-3 rounded-xl bg-white/5 border border-white/10 text-[10px] font-bold uppercase tracking-widest hover:bg-white/10 transition-all">Enviar Documentação</button>
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

function ProductRow({ name, price, views, leads }: any) {
  return (
    <div className="flex items-center justify-between p-4 rounded-2xl bg-white/5 border border-white/5 hover:border-primary/30 transition-all">
      <div className="flex flex-col">
        <span className="text-xs font-black text-white uppercase italic">{name}</span>
        <span className="text-[10px] font-bold text-primary">{price}</span>
      </div>
      <div className="flex items-center gap-4">
        <div className="text-right">
          <span className="text-[8px] font-bold text-muted-foreground uppercase block">Visitas</span>
          <span className="text-[10px] font-black text-white">{views}</span>
        </div>
        <div className="text-right">
          <span className="text-[8px] font-bold text-muted-foreground uppercase block">Leads</span>
          <span className="text-[10px] font-black text-[#00FF87]">{leads}</span>
        </div>
        <button className="p-2 hover:bg-white/10 rounded-lg transition-colors">
          <ChevronRight className="w-4 h-4 text-muted-foreground" />
        </button>
      </div>
    </div>
  );
}

function MessageItem({ user, time, text }: any) {
  return (
    <div className="space-y-1 cursor-pointer group">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-black text-white group-hover:text-primary transition-colors">{user}</span>
        <span className="text-[8px] text-muted-foreground">{time}</span>
      </div>
      <p className="text-[10px] text-muted-foreground line-clamp-1 italic">{text}</p>
    </div>
  );
}