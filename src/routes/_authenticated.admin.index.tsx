import { createFileRoute } from "@tanstack/react-router";
import { usePerformanceMode } from "@/hooks/use-performance-mode";
import { 
  Users, 
  ShieldCheck, 
  Activity,
  AlertTriangle,
  ArrowUpRight
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/")({
  component: AdminDashboard,
});

function AdminDashboard() {
  const { glassClass } = usePerformanceMode();

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <header>
        <h1 className="text-4xl font-black text-white tracking-tight">Painel do Administrador</h1>
        <p className="text-muted-foreground mt-2">Visão geral de todo o ecossistema FIXXER.</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <AdminStatCard 
          icon={<Users className="text-primary" />} 
          label="Total Usuários" 
          value="1,284" 
          change="+12% este mês"
          glassClass={glassClass} 
        />
        <AdminStatCard 
          icon={<ShieldCheck className="text-primary" />} 
          label="Sessões Ativas" 
          value="42" 
          change="Normal"
          glassClass={glassClass} 
        />
        <AdminStatCard 
          icon={<AlertTriangle className="text-yellow-400" />} 
          label="Chamados" 
          value="3" 
          change="Urgente"
          glassClass={glassClass} 
        />
      </div>

      <div className={`p-8 rounded-3xl ${glassClass} border border-white/5`}>
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-xl font-bold flex items-center gap-3">
            <Activity className="w-5 h-5 text-primary" />
            Logs do Sistema
          </h2>
          <button className="text-xs font-bold uppercase tracking-widest text-primary hover:underline">Ver tudo</button>
        </div>
        
        <div className="space-y-4">
          {[
            { user: "Jorge Ricardo", action: "Acesso administrativo", time: "2 min atrás" },
            { user: "Marcenaria Silva", action: "Novo projeto criado", time: "15 min atrás" },
            { user: "Sistema", action: "Backup concluído", time: "1 hora atrás" }
          ].map((log, i) => (
            <div key={i} className="flex items-center justify-between p-4 rounded-2xl bg-white/5 border border-white/5 hover:bg-white/10 transition-colors cursor-pointer group">
              <div className="flex items-center gap-4">
                <div className="w-2 h-2 rounded-full bg-primary shadow-[0_0_5px_rgba(0,255,135,1)]" />
                <div>
                  <p className="font-bold text-sm text-white">{log.user}</p>
                  <p className="text-xs text-muted-foreground">{log.action}</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-[10px] font-medium text-muted-foreground/60 uppercase">{log.time}</span>
                <ArrowUpRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function AdminStatCard({ icon, label, value, change, glassClass }: any) {
  return (
    <div className={`p-6 rounded-3xl ${glassClass} border border-white/5 hover:border-primary/20 transition-all group`}>
      <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
        {icon}
      </div>
      <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-1">{label}</p>
      <h3 className="text-3xl font-black text-white">{value}</h3>
      <p className="text-[10px] font-bold text-primary mt-2">{change}</p>
    </div>
  );
}
