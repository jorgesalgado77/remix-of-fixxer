import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { usePerformanceMode } from "@/hooks/use-performance-mode";
import { 
  Users, 
  Briefcase, 
  DollarSign, 
  AlertOctagon, 
  CheckCircle2, 
  Ban, 
  Star, 
  ShieldAlert,
  ArrowUpRight,
  Filter,
  Search,
  MoreVertical,
  Activity,
  Layers
} from "lucide-react";
import { useState, useEffect } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/")({
  component: AdminDashboard,
});

function AdminDashboard() {
  const { glassClass } = usePerformanceMode();
  const [metrics, setMetrics] = useState({
    totalUsers: 0,
    activeOS: 0,
    totalVolume: 0,
    pendingReports: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMetrics = async () => {
      setLoading(true);
      try {
        // Mocking metrics for immediate visual feedback as requested for "instant navigation"
        // In a real scenario, we'd use supabase.rpc() or multiple counts
        setMetrics({
          totalUsers: 1248,
          activeOS: 84,
          totalVolume: 45250,
          pendingReports: 3
        });
      } catch (error) {
        console.error("Error fetching metrics:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchMetrics();
  }, []);

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20 md:pb-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-white tracking-tight flex items-center gap-2">
            <ShieldAlert className="w-8 h-8 text-[#00FF87]" />
            HUB MASTER <span className="text-[#00FF87]">360°</span>
          </h1>
          <p className="text-muted-foreground text-sm">Controle total da plataforma FIXXER</p>
        </div>
        
        <div className="flex items-center gap-2 overflow-x-auto pb-2 md:pb-0">
          <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#00FF87]/10 text-[#00FF87] text-[10px] font-bold uppercase tracking-wider border border-[#00FF87]/20">
            <Activity className="w-3 h-3" /> Sistema Online
          </span>
          <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-blue-500/10 text-blue-400 text-[10px] font-bold uppercase tracking-wider border border-blue-500/20">
            v2.4.0-Production
          </span>
        </div>
      </div>

      {/* 1. DASHBOARD DE MÉTRICAS GERAIS */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard 
          icon={<Users className="w-5 h-5" />}
          label="Usuários"
          value={metrics.totalUsers.toLocaleString()}
          color="text-[#00FF87]"
          loading={loading}
        />
        <MetricCard 
          icon={<Briefcase className="w-5 h-5" />}
          label="O.S. Ativas"
          value={metrics.activeOS.toString()}
          color="text-blue-400"
          loading={loading}
        />
        <MetricCard 
          icon={<DollarSign className="w-5 h-5" />}
          label="Volume (R$)"
          value={`R$ ${(metrics.totalVolume / 1000).toFixed(1)}k`}
          color="text-emerald-400"
          loading={loading}
        />
        <MetricCard 
          icon={<AlertOctagon className="w-5 h-5" />}
          label="Denúncias"
          value={metrics.pendingReports.toString()}
          color="text-red-400"
          loading={loading}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 2. GESTÃO DE USUÁRIOS (RESUMO) */}
        <div className={`lg:col-span-2 ${glassClass} border border-white/5 rounded-2xl overflow-hidden flex flex-col`}>
          <div className="p-5 border-b border-white/5 flex items-center justify-between">
            <h3 className="font-bold flex items-center gap-2">
              <Users className="w-4 h-4 text-[#00FF87]" />
              Gestão de Usuários
            </h3>
            <div className="flex items-center gap-2">
              <div className="relative hidden md:block">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input 
                  type="text" 
                  placeholder="Buscar CPF/Nome..." 
                  className="bg-black/40 border border-white/10 rounded-lg py-1.5 pl-9 pr-3 text-xs focus:border-[#00FF87] outline-none transition-colors w-48"
                />
              </div>
              <button className="p-2 bg-white/5 rounded-lg hover:bg-white/10 transition-colors">
                <Filter className="w-4 h-4" />
              </button>
            </div>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="bg-white/5 text-muted-foreground text-[10px] uppercase tracking-wider font-bold">
                  <th className="px-5 py-3">Usuário</th>
                  <th className="px-5 py-3">Perfil</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3">Reputação</th>
                  <th className="px-5 py-3 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                <UserRow 
                  name="Jorge Ricardo" 
                  email="jorgericardosalgado@gmail.com" 
                  role="Admin" 
                  status="Ativo" 
                  rating={5}
                />
                <UserRow 
                  name="Carlos Montador" 
                  email="carlos@fixxer.com" 
                  role="Prestador" 
                  status="Ativo" 
                  rating={4.8}
                />
                <UserRow 
                  name="Loja Premium" 
                  email="contato@premium.com" 
                  role="Lojista" 
                  status="Em Revisão" 
                  rating={0}
                />
                <UserRow 
                  name="Pedro Silva" 
                  email="pedro@user.com" 
                  role="Cliente" 
                  status="Suspenso" 
                  rating={2.1}
                />
              </tbody>
            </table>
          </div>
          <div className="p-4 border-t border-white/5 text-center">
            <button className="text-[10px] font-bold text-[#00FF87] hover:underline uppercase tracking-widest">
              Ver Todos os Usuários
            </button>
          </div>
        </div>

        {/* 3. MODERAÇÃO DE FEEDS & CONFIGS */}
        <div className="space-y-6">
          <div className={`${glassClass} border border-white/5 rounded-2xl p-5`}>
            <h3 className="font-bold mb-4 flex items-center gap-2">
              <Activity className="w-4 h-4 text-blue-400" />
              Moderação de Feed
            </h3>
            <div className="space-y-3">
              <FeedActivityItem 
                title="Demanda: Montagem Cozinha" 
                user="Loja ABC" 
                type="B2B"
              />
              <FeedActivityItem 
                title="Vitrine: Gesso 3D" 
                user="Artes Gesso" 
                type="Prestador"
              />
              <FeedActivityItem 
                title="Obra: Reforma Total" 
                user="Maria Oliveira" 
                type="B2C"
              />
            </div>
            <button className="w-full mt-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-bold transition-colors">
              Abrir Central de Moderação
            </button>
          </div>

          <div className={`${glassClass} border border-white/5 rounded-2xl p-5`}>
            <h3 className="font-bold mb-4 flex items-center gap-2">
              <Layers className="w-4 h-4 text-emerald-400" />
              Configuração Master
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <ConfigButton icon={<Layers className="w-4 h-4" />} label="Categorias" />
              <ConfigButton icon={<DollarSign className="w-4 h-4" />} label="Taxas" />
              <ConfigButton icon={<ShieldAlert className="w-4 h-4" />} label="RLS Audit" />
              <ConfigButton icon={<ArrowUpRight className="w-4 h-4" />} label="Webhooks" />
            </div>
          </div>
        </div>
      </div>

      {/* 4. AUDITORIA FINANCEIRA (ESCROW) */}
      <div className={`${glassClass} border border-white/5 rounded-2xl p-6`}>
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
          <div>
            <h3 className="font-bold text-lg flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-emerald-400" />
              Garantia de Obras (Escrow)
            </h3>
            <p className="text-xs text-muted-foreground">Monitoramento de valores retidos em custódia</p>
          </div>
          <div className="px-4 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
            <span className="text-xs text-muted-foreground">Total em Custódia:</span>
            <span className="ml-2 font-black text-emerald-400">R$ 124.500,00</span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <EscrowCard 
            id="OS-2490" 
            value={4500} 
            status="Em Disputa" 
            parties="Loja Móveis X vs Carlos M." 
          />
          <EscrowCard 
            id="OS-2512" 
            value={1200} 
            status="Aguardando Liberação" 
            parties="Cliente Final vs Pedro G." 
          />
          <EscrowCard 
            id="OS-2550" 
            value={850} 
            status="Concluído" 
            isCompleted 
          />
        </div>
      </div>
    </div>
  );
}

function MetricCard({ icon, label, value, color, loading }: { icon: any, label: string, value: string, color: string, loading: boolean }) {
  return (
    <div className="bg-black/40 border border-white/5 rounded-2xl p-4 flex flex-col gap-2 relative overflow-hidden group">
      <div className={`w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center ${color} group-hover:scale-110 transition-transform duration-500`}>
        {icon}
      </div>
      <div>
        <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">{label}</div>
        {loading ? (
          <div className="h-7 w-20 bg-white/5 animate-pulse rounded mt-1"></div>
        ) : (
          <div className="text-xl md:text-2xl font-black text-white">{value}</div>
        )}
      </div>
      <div className={`absolute -right-2 -bottom-2 opacity-5 ${color} scale-150`}>
        {icon}
      </div>
    </div>
  );
}

function UserRow({ name, email, role, status, rating }: any) {
  const getStatusColor = (s: string) => {
    if (s === 'Ativo') return 'text-[#00FF87] bg-[#00FF87]/10 border-[#00FF87]/20';
    if (s === 'Em Revisão') return 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20';
    return 'text-red-400 bg-red-400/10 border-red-400/20';
  };

  return (
    <tr className="hover:bg-white/5 transition-colors group">
      <td className="px-5 py-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#00FF87]/20 to-blue-500/20 border border-white/10 flex items-center justify-center font-bold text-xs">
            {name.charAt(0)}
          </div>
          <div className="flex flex-col">
            <span className="font-bold text-white">{name}</span>
            <span className="text-[10px] text-muted-foreground">{email}</span>
          </div>
        </div>
      </td>
      <td className="px-5 py-4">
        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-white/5 border border-white/10 uppercase">
          {role}
        </span>
      </td>
      <td className="px-5 py-4">
        <span className={`text-[10px] font-bold px-2 py-0.5 rounded border uppercase ${getStatusColor(status)}`}>
          {status}
        </span>
      </td>
      <td className="px-5 py-4">
        <div className="flex items-center gap-1 text-yellow-400">
          <Star className="w-3 h-3 fill-current" />
          <span className="text-xs font-bold">{rating || '--'}</span>
        </div>
      </td>
      <td className="px-5 py-4 text-right">
        <button className="p-2 hover:bg-white/10 rounded-lg transition-colors">
          <MoreVertical className="w-4 h-4 text-muted-foreground" />
        </button>
      </td>
    </tr>
  );
}

function FeedActivityItem({ title, user, type }: any) {
  return (
    <div className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/5 hover:border-[#00FF87]/30 transition-all cursor-pointer group">
      <div className="flex flex-col">
        <span className="text-xs font-bold text-white group-hover:text-[#00FF87] transition-colors">{title}</span>
        <span className="text-[10px] text-muted-foreground">{user} • {type}</span>
      </div>
      <div className="flex items-center gap-1">
        <button className="p-1.5 hover:bg-red-500/20 rounded-lg text-red-400" title="Excluir">
          <Ban className="w-3.5 h-3.5" />
        </button>
        <button className="p-1.5 hover:bg-[#00FF87]/20 rounded-lg text-[#00FF87]" title="Destaque">
          <CheckCircle2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}

function ConfigButton({ icon, label }: any) {
  return (
    <button className="flex flex-col items-center justify-center gap-2 p-4 rounded-xl bg-white/5 border border-white/5 hover:border-primary/50 hover:bg-primary/5 transition-all">
      <div className="text-primary">{icon}</div>
      <span className="text-[10px] font-bold uppercase tracking-widest">{label}</span>
    </button>
  );
}

function EscrowCard({ id, value, status, parties, isCompleted }: any) {
  return (
    <div className={`p-4 rounded-xl border ${isCompleted ? 'border-emerald-500/20 bg-emerald-500/5' : 'border-white/5 bg-black/40'} flex flex-col gap-2`}>
      <div className="flex items-center justify-between">
        <span className="text-xs font-black text-[#00FF87]">{id}</span>
        <span className="text-xs font-bold text-white">R$ {value.toLocaleString()}</span>
      </div>
      {parties && <div className="text-[10px] text-muted-foreground truncate">{parties}</div>}
      <div className="flex items-center justify-between mt-2">
        <span className={`text-[10px] font-bold uppercase ${status === 'Em Disputa' ? 'text-red-400' : isCompleted ? 'text-emerald-400' : 'text-blue-400'}`}>
          {status}
        </span>
        {!isCompleted && (
          <button className="text-[10px] font-bold px-2 py-1 rounded bg-white/10 hover:bg-white/20 transition-colors uppercase">
            Liberar
          </button>
        )}
      </div>
    </div>
  );
}