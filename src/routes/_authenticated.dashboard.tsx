import { createFileRoute } from "@tanstack/react-router";
import { usePerformanceMode } from "@/hooks/use-performance-mode";
import { 
  LayoutDashboard, 
  Users, 
  Settings, 
  MessageSquare, 
  TrendingUp,
  Package,
  Clock
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: Dashboard,
});

function Dashboard() {
  const { glassClass } = usePerformanceMode();

  return (
    <div className="p-6 space-y-8 animate-in fade-in duration-700">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white">Dashboard Central</h1>
          <p className="text-muted-foreground">Bem-vindo ao centro de comando FIXXER.</p>
        </div>
        <Link 
          to="/_authenticated/profile"
          className={`flex items-center gap-3 p-3 rounded-2xl border border-white/10 hover:border-primary/50 transition-all ${glassClass}`}
        >
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
            <Settings className="w-5 h-5" />
          </div>
          <div className="text-left pr-4">
            <p className="text-xs font-black uppercase tracking-tighter text-white leading-tight">Meu Perfil</p>
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Gerenciar Conta</p>
          </div>
        </Link>
      </header>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard 
          icon={<Package className="w-4 h-4 text-primary" />} 
          label="Ordens Ativas" 
          value="12" 
          glassClass={glassClass}
        />
        <StatCard 
          icon={<Clock className="w-4 h-4 text-primary" />} 
          label="Pendentes" 
          value="5" 
          glassClass={glassClass}
        />
        <StatCard 
          icon={<MessageSquare className="w-4 h-4 text-primary" />} 
          label="Mensagens" 
          value="3" 
          glassClass={glassClass}
        />
        <StatCard 
          icon={<TrendingUp className="w-4 h-4 text-primary" />} 
          label="Faturamento" 
          value="R$ 15k" 
          glassClass={glassClass}
        />
      </div>

      {/* Main Content Area */}
      <div className="grid md:grid-cols-3 gap-6">
        <div className={`md:col-span-2 p-6 rounded-3xl ${glassClass}`}>
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <LayoutDashboard className="w-5 h-5 text-primary" />
            Atividades Recentes
          </h2>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center justify-between p-4 rounded-2xl bg-white/5 border border-white/5">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">OS</div>
                  <div>
                    <p className="font-bold text-sm">Montagem Armário Cozinha</p>
                    <p className="text-xs text-muted-foreground">Cliente: Residencial Alpha</p>
                  </div>
                </div>
                <span className="text-[10px] font-bold uppercase px-2 py-1 bg-primary/20 text-primary rounded-full">Em progresso</span>
              </div>
            ))}
          </div>
        </div>

        <div className={`p-6 rounded-3xl ${glassClass}`}>
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <Users className="w-5 h-5 text-primary" />
            Equipe / Parceiros
          </h2>
          <div className="space-y-4">
             {["Carlos Montador", "Vidraçaria Silva", "Marmoraria Prime"].map((name) => (
               <div key={name} className="flex items-center gap-3">
                 <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center text-xs font-bold">{name[0]}</div>
                 <span className="text-sm font-medium">{name}</span>
               </div>
             ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, glassClass }: { icon: any, label: string, value: string, glassClass: string }) {
  return (
    <div className={`p-5 rounded-2xl ${glassClass}`}>
      <div className="flex items-center justify-between mb-3">
        <div className="p-2 bg-white/5 rounded-lg">{icon}</div>
      </div>
      <p className="text-2xl font-black text-white">{value}</p>
      <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{label}</p>
    </div>
  );
}
