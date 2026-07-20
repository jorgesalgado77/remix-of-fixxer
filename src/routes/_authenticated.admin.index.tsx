import { createFileRoute } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { usePerformanceMode } from "@/hooks/use-performance-mode";
import { Users, CreditCard, ShieldCheck } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/")({
  component: AdminDashboard,
});

function AdminDashboard() {
  const { glassClass } = usePerformanceMode();

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h1 className="text-3xl font-black text-white tracking-tight mb-2">Dashboard Administrativo</h1>
        <p className="text-muted-foreground">Visão geral do sistema FIXXER.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard 
          icon={<Users className="w-5 h-5 text-primary" />} 
          label="Total de Usuários" 
          value="--" 
          glassClass={glassClass} 
        />
        <StatCard 
          icon={<CreditCard className="w-5 h-5 text-emerald-400" />} 
          label="Planos Ativos" 
          value="3" 
          glassClass={glassClass} 
        />
        <StatCard 
          icon={<ShieldCheck className="w-5 h-5 text-blue-400" />} 
          label="Status do Sistema" 
          value="Online" 
          glassClass={glassClass} 
        />
      </div>

      <div className={`${glassClass} border border-white/5 rounded-2xl p-6`}>
        <h2 className="text-xl font-bold mb-4">Ações Rápidas</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <button className="flex items-center gap-3 p-4 rounded-xl bg-white/5 hover:bg-white/10 transition-colors text-left">
            <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
              <Users className="w-5 h-5 text-primary" />
            </div>
            <div>
              <div className="font-bold">Gerenciar Usuários</div>
              <div className="text-xs text-muted-foreground">Promover ou rebaixar roles</div>
            </div>
          </button>
          <button className="flex items-center gap-3 p-4 rounded-xl bg-white/5 hover:bg-white/10 transition-colors text-left">
            <div className="w-10 h-10 rounded-lg bg-emerald-500/20 flex items-center justify-center">
              <CreditCard className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <div className="font-bold">Gerenciar Planos</div>
              <div className="text-xs text-muted-foreground">Configurar assinaturas e features</div>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, glassClass }: { icon: any, label: string, value: string, glassClass: string }) {
  return (
    <div className={`${glassClass} border border-white/5 rounded-2xl p-6 flex items-center gap-4`}>
      <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center shrink-0">
        {icon}
      </div>
      <div>
        <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider">{label}</div>
        <div className="text-2xl font-black text-white">{value}</div>
      </div>
    </div>
  );
}