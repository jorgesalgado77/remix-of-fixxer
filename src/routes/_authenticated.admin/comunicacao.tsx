import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { 
  ShieldAlert, 
  MessageSquare, 
  Activity, 
  Search, 
  Filter,
  Calendar,
  User,
  AlertCircle,
  Clock,
  CheckCircle2,
  ChevronRight,
  TrendingDown,
  TrendingUp,
  Ban
} from "lucide-react";
import { useState, useEffect, useMemo } from "react";
import { supabaseExternal } from "@/lib/supabaseExternal";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/comunicacao")({
  component: AdminCommunicationAudit,
});

type BlockAttempt = {
  id: string;
  sender_id: string;
  recipient_id: string;
  content: string;
  reason: string;
  created_at: string;
  sender_name?: string;
  recipient_name?: string;
};

type ChatMetrics = {
  total_messages: number;
  blocked_attempts: number;
  rate_limit_hits: number;
  avg_messages_per_user: number;
};

function AdminCommunicationAudit() {
  const [loading, setLoading] = useState(true);
  const [attempts, setAttempts] = useState<BlockAttempt[]>([]);
  const [metrics, setMetrics] = useState<ChatMetrics>({
    total_messages: 0,
    blocked_attempts: 0,
    rate_limit_hits: 0,
    avg_messages_per_user: 0
  });
  const [search, setSearch] = useState("");
  const [dateRange, setDateRange] = useState("7d");

  useEffect(() => {
    fetchAuditData();
  }, [dateRange]);

  const fetchAuditData = async () => {
    setLoading(true);
    try {
      // Mocking fetch logic for demo/baseline
      // In production, these would be RPC calls or logs tables queries
      
      // 1. Fetch blocked attempts from os_status_logs or a dedicated communication_audit table
      const { data: logs, error } = await supabaseExternal
        .from("notifications") // temporary fallback until audit table is migrated
        .select("*")
        .limit(20);

      if (error) throw error;

      // Simulated transformations
      setAttempts([
        {
          id: "1",
          sender_id: "user-a",
          recipient_id: "user-b",
          content: "Tentei mandar meu zap: 99999-9999",
          reason: "Anti-Bypass Filter",
          created_at: new Date().toISOString(),
          sender_name: "Lojista Silva",
          recipient_name: "Prestador Carlos"
        },
        {
          id: "2",
          sender_id: "user-c",
          recipient_id: "user-d",
          content: "Me paga no pix p@p.com",
          reason: "Financial Safety Filter",
          created_at: new Date(Date.now() - 3600000).toISOString(),
          sender_name: "Cliente Ana",
          recipient_name: "Lojista Souza"
        }
      ]);

      setMetrics({
        total_messages: 1250,
        blocked_attempts: 42,
        rate_limit_hits: 15,
        avg_messages_per_user: 12.4
      });

    } catch (err) {
      console.error("Audit fetch failed:", err);
      toast.error("Erro ao carregar dados de auditoria");
    } finally {
      setLoading(false);
    }
  };

  const filteredAttempts = useMemo(() => {
    return attempts.filter(a => 
      a.sender_name?.toLowerCase().includes(search.toLowerCase()) ||
      a.content.toLowerCase().includes(search.toLowerCase()) ||
      a.reason.toLowerCase().includes(search.toLowerCase())
    );
  }, [attempts, search]);

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
      {/* Header */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#0A0A0B] to-background border border-white/10 p-8 shadow-2xl">
        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/5 blur-[100px] rounded-full" />
        <div className="relative z-10">
          <div className="flex items-center gap-3 text-blue-400 mb-4">
            <ShieldAlert className="w-6 h-6" />
            <span className="text-sm font-bold uppercase tracking-widest">Auditoria de Segurança</span>
          </div>
          <h1 className="text-4xl font-black text-white mb-2 tracking-tight">
            Monitor de Comunicação <span className="text-blue-500">& Abuse</span>
          </h1>
          <p className="text-muted-foreground max-w-2xl">
            Visualização de tentativas bloqueadas, rate limiting e integridade do chat FIXXER.
          </p>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-[#121214] border border-white/5 p-6 rounded-3xl group hover:border-blue-500/30 transition-all">
          <div className="w-12 h-12 bg-blue-500/10 rounded-2xl flex items-center justify-center text-blue-500 mb-4 group-hover:scale-110 transition-transform">
            <MessageSquare className="w-6 h-6" />
          </div>
          <div className="text-3xl font-black text-white mb-1">{metrics.total_messages}</div>
          <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
            Mensagens <TrendingUp className="w-3 h-3 text-emerald-400" />
          </div>
        </div>

        <div className="bg-[#121214] border border-white/5 p-6 rounded-3xl group hover:border-red-500/30 transition-all">
          <div className="w-12 h-12 bg-red-500/10 rounded-2xl flex items-center justify-center text-red-500 mb-4 group-hover:scale-110 transition-transform">
            <Ban className="w-6 h-6" />
          </div>
          <div className="text-3xl font-black text-white mb-1">{metrics.blocked_attempts}</div>
          <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
            Bloqueios (Bypass) <TrendingDown className="w-3 h-3 text-red-400" />
          </div>
        </div>

        <div className="bg-[#121214] border border-white/5 p-6 rounded-3xl group hover:border-amber-500/30 transition-all">
          <div className="w-12 h-12 bg-amber-500/10 rounded-2xl flex items-center justify-center text-amber-500 mb-4 group-hover:scale-110 transition-transform">
            <Clock className="w-6 h-6" />
          </div>
          <div className="text-3xl font-black text-white mb-1">{metrics.rate_limit_hits}</div>
          <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Rate Limit Hits</div>
        </div>

        <div className="bg-[#121214] border border-white/5 p-6 rounded-3xl group hover:border-purple-500/30 transition-all">
          <div className="w-12 h-12 bg-purple-500/10 rounded-2xl flex items-center justify-center text-purple-500 mb-4 group-hover:scale-110 transition-transform">
            <User className="w-6 h-6" />
          </div>
          <div className="text-3xl font-black text-white mb-1">{metrics.avg_messages_per_user}</div>
          <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Msg/Usuário (Média)</div>
        </div>
      </div>

      {/* Audit Log Table */}
      <div className="bg-[#121214] border border-white/5 rounded-3xl overflow-hidden shadow-2xl">
        <div className="p-6 border-b border-white/5 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Activity className="w-5 h-5 text-blue-400" />
              Log de Tentativas Bloqueadas
            </h2>
            <p className="text-xs text-muted-foreground">Filtro em tempo real de violações de política.</p>
          </div>

          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
              <input 
                type="text" 
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Pesquisar..." 
                className="bg-black/40 border border-white/10 rounded-xl py-2 pl-9 pr-4 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-blue-500/50 transition-colors w-full md:w-64"
              />
            </div>
            
            <select 
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              className="bg-black/40 border border-white/10 rounded-xl py-2 px-4 text-sm text-white focus:outline-none focus:border-blue-500/50 transition-colors"
            >
              <option value="24h">Últimas 24h</option>
              <option value="7d">Últimos 7 dias</option>
              <option value="30d">Último mês</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-white/[0.02]">
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-white/40 border-b border-white/5">Data/Hora</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-white/40 border-b border-white/5">Origem (Remetente)</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-white/40 border-b border-white/5">Conteúdo Sensível</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-white/40 border-b border-white/5">Motivo</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-white/40 border-b border-white/5 text-right">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td colSpan={5} className="px-6 py-8">
                      <div className="h-4 bg-white/5 rounded-full w-full" />
                    </td>
                  </tr>
                ))
              ) : filteredAttempts.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-20 text-center">
                    <AlertCircle className="w-12 h-12 text-white/10 mx-auto mb-4" />
                    <p className="text-white/40 font-bold">Nenhuma tentativa bloqueada no período.</p>
                  </td>
                </tr>
              ) : (
                filteredAttempts.map((a) => (
                  <tr key={a.id} className="hover:bg-white/[0.01] transition-colors group">
                    <td className="px-6 py-5">
                      <div className="text-sm text-white/80 font-mono">
                        {new Date(a.created_at).toLocaleString('pt-BR')}
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center text-blue-400 font-bold text-xs">
                          {a.sender_name?.charAt(0)}
                        </div>
                        <div>
                          <div className="text-sm font-bold text-white">{a.sender_name}</div>
                          <div className="text-[10px] text-white/40 font-mono">{a.sender_id.slice(0, 8)}...</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <div className="text-sm text-white/60 bg-red-500/5 border border-red-500/10 rounded-lg p-3 max-w-xs line-clamp-2 italic">
                        "{a.content}"
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500/10 text-amber-500 border border-amber-500/20">
                        {a.reason}
                      </span>
                    </td>
                    <td className="px-6 py-5 text-right">
                      <button className="p-2 rounded-lg bg-white/5 border border-white/10 text-white/40 hover:text-white hover:bg-blue-500 transition-all">
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="p-4 bg-white/[0.02] border-t border-white/5 flex items-center justify-between text-xs text-white/30 font-bold uppercase tracking-widest">
          <span>Mostrando {filteredAttempts.length} registros</span>
          <div className="flex gap-2">
            <button disabled className="px-3 py-1 rounded bg-white/5 opacity-50">Anterior</button>
            <button disabled className="px-3 py-1 rounded bg-white/5 opacity-50">Próximo</button>
          </div>
        </div>
      </div>
    </div>
  );
}
