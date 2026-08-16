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
  MessageSquare,
  User
} from "lucide-react";
import { PanelActions } from "@/components/PanelActions";
import { CoinBalancePlanCard } from "@/components/CoinBalancePlanCard";
import { MyAppointmentsSection } from "@/components/MyAppointmentsSection";
import { ProfileHeader } from "@/components/ProfileHeader";
import { useState } from "react";

export const Route = createFileRoute("/_authenticated/parceiro")({
  component: ParceiroDashboard,
});

function ParceiroDashboard() {
  const { glassClass } = usePerformanceMode();

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-8 pb-24 lg:pl-72 animate-in fade-in duration-500">
      <ProfileHeader 
        role="parceiro" 
        actions={
          <Link to="/feed/parceiro" search={{ urgency: 'todos', distance: 'todos', tag: '' }} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#00FF87] text-black font-black uppercase italic text-[10px] tracking-widest hover:shadow-[0_0_15px_rgba(0,255,135,0.3)] transition-all shrink-0">
            <TrendingUp className="w-3 h-3" /> Feed Fixxer
          </Link>
        }
      />


      <CoinBalancePlanCard />

      <MyAppointmentsSection />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Valores reais virão de hooks de métricas em turnos futuros */}
        <StatCard icon={<Users className="w-5 h-5" />} label="Leads" value="0" color="text-blue-400" />
        <StatCard icon={<TrendingUp className="w-5 h-5" />} label="Vistas" value="0" color="text-[#00FF87]" />
        <StatCard icon={<Package className="w-5 h-5" />} label="Produtos" value="0" color="text-emerald-400" />
        <StatCard icon={<DollarSign className="w-5 h-5" />} label="Vendas" value="R$ 0,00" color="text-amber-400" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className={`lg:col-span-2 ${glassClass} border border-white/5 rounded-3xl p-6 space-y-6`}>
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-black text-white uppercase italic flex items-center gap-2">
              <Package className="w-5 h-5 text-primary" /> Minha Vitrine Ativa
            </h2>
            <Link to="/feed/parceiro" search={{ urgency: 'todos', distance: 'todos', tag: '' }} className="text-[10px] font-bold text-primary uppercase tracking-widest hover:underline">Ver Feed B2B</Link>
          </div>
          <div className="flex flex-col items-center justify-center py-12 text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center border border-white/10">
              <Package className="w-8 h-8 text-muted-foreground" />
            </div>
            <div>
              <p className="text-sm font-bold text-white uppercase tracking-tighter">Sua vitrine está vazia</p>
              <p className="text-[10px] text-muted-foreground uppercase tracking-widest mt-1">Publique produtos para aparecer no feed dos lojistas</p>
            </div>
            <button 
              onClick={() => {
                const event = new CustomEvent('fixxer:open-create-ad', { detail: { category: 'fornecedor' } });
                window.dispatchEvent(event);
              }}
              className="px-6 py-2 rounded-xl bg-primary text-black font-black uppercase text-[10px] tracking-widest"
            >
              Criar Primeiro Anúncio
            </button>
          </div>
        </div>


        <div className="space-y-6">
          <div className={`${glassClass} border border-white/5 rounded-3xl p-6`}>
            <h2 className="text-sm font-black text-white uppercase italic mb-4 flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-blue-400" /> Mensagens Recentes
            </h2>
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <MessageSquare className="w-8 h-8 text-muted-foreground/30 mb-2" />
              <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">Nenhuma conversa ativa</p>
            </div>
          </div>
          <div className={`${glassClass} border border-white/5 rounded-3xl p-6 bg-gradient-to-br from-[#00FF87]/5 to-transparent`}>
             <h2 className="text-sm font-black text-white uppercase italic mb-2">Selo de Verificado</h2>
             <p className="text-[10px] text-muted-foreground font-medium mb-4">Aumente sua credibilidade enviando seus documentos comerciais.</p>
             <Link to="/profile" search={{ id: undefined, context: undefined, focus: undefined }} className="block w-full py-3 rounded-xl bg-white/5 border border-white/10 text-center text-[10px] font-bold uppercase tracking-widest hover:bg-white/10 transition-all">Configurar Perfil</Link>
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