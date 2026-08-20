import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { useProviderStats } from "@/hooks/use-provider-stats";
import { StatDetailsModal, type StatListItem } from "@/components/StatDetailsModal";
import { usePerformanceMode } from "@/hooks/use-performance-mode";
import {
  Briefcase,
  MapPin,
  Star,
  CheckCircle2,
  Clock,
  DollarSign,
  MessageSquare,
  ChevronRight,
  TrendingUp,
  ShieldCheck,
  PlusCircle,
  Camera,
  Hammer,
  QrCode,
  TrendingDown,
} from "lucide-react";

import { EscrowBadge } from "@/components/EscrowBadge";
import { PanelActions } from "@/components/PanelActions";
import { CoinBalancePlanCard } from "@/components/CoinBalancePlanCard";
import { RecentStoresCarousel } from "@/components/RecentStoresCarousel";
import { MyAppointmentsSection } from "@/components/MyAppointmentsSection";
import { ProfileHeader } from "@/components/ProfileHeader";
import { ProfileSyncStatus } from "@/components/ProfileSyncStatus";
import { useCurrentUserId } from "@/lib/current-user";





export const Route = createFileRoute("/_authenticated/prestador")({
  component: PrestadorDashboard,
});

function PrestadorDashboard() {
  const { glassClass } = usePerformanceMode();
  const userId = useCurrentUserId();

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-8 pb-24 lg:pl-72 animate-in fade-in duration-500">
      <ProfileHeader 
        role="prestador" 
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <CoinBalancePlanCard />
        {userId && <ProfileSyncStatus userId={userId} />}
      </div>

      <RecentStoresCarousel />



      <MyAppointmentsSection />


      <ProviderStatsGrid />


      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className={`lg:col-span-2 space-y-6`}>
          <div className={`${glassClass} border border-white/5 rounded-3xl p-6`}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-sm font-black text-white uppercase italic flex items-center gap-2">
                <Clock className="w-5 h-5 text-primary" /> Trabalhos em Andamento
              </h2>
            </div>
            <div className="space-y-4">
              {/* Os jobs abaixo são exemplos visuais, mas o componente deve ser alimentado por useProviderStats() em produção */}
              <JobCard id="OS-2490" client="Loja Móveis Premium" category="Montagem" value="R$ 450,00" status="Em Execução" />
              <JobCard id="OS-2512" client="Carlos Silva (Residencial)" category="Elétrica" value="R$ 180,00" status="Aguardando" />
            </div>
          </div>

          <div className={`${glassClass} border border-white/5 rounded-3xl p-6`}>
             <h2 className="text-sm font-black text-white uppercase italic mb-6">Minha Vitrine (Público)</h2>
             <div className="p-4 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-between">
                <div className="flex items-center gap-3">
                   <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center text-primary font-black italic">M</div>
                   <div>
                      <span className="text-xs font-black text-white uppercase italic">Montador Especialista em Planejados</span>
                      <div className="flex items-center gap-2 mt-1">
                         <span className="text-[8px] font-bold text-primary uppercase">Ativo no Feed</span>
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
            <button className="w-full py-3 rounded-xl bg-primary/10 border border-primary/20 text-[9px] font-black text-primary uppercase tracking-widest flex items-center justify-center gap-2">
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

const BRL = (n: number) =>
  n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const fmtDate = (d?: string | null) =>
  d ? new Date(d).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" }) : "";

function ProviderStatsGrid() {
  const stats = useProviderStats();
  const [openKey, setOpenKey] = useState<null | "ativos" | "concluidos" | "rating" | "saldo">(null);
  const [showPixModal, setShowPixModal] = useState(false);
  const [period, setPeriod] = useState("30");

  const filterByPeriod = (items: any[]) => {
    const now = new Date();
    const days = parseInt(period);
    const limit = new Date(now.setDate(now.getDate() - days));
    return items.filter(it => new Date(it.created_at) >= limit);
  };

  const orderItems = (list: typeof stats.activeOrders): StatListItem[] =>
    filterByPeriod(list).map((o) => ({
      id: o.id,
      title: o.title?.trim() || `O.S. ${String(o.id).slice(0, 8)}`,
      subtitle: o.status ? `Status: ${o.status}` : undefined,
      meta: fmtDate(o.created_at),
      right: typeof o.price === "number" ? BRL(o.price) : undefined,
    }));

  const reviewItems: StatListItem[] = filterByPeriod(stats.reviews).map((r) => ({
    id: r.id,
    title: `${Number(r.rating ?? 0).toFixed(1)} ★`,
    subtitle: r.comment?.trim() || "Sem comentário",
    meta: fmtDate(r.created_at),
  }));

  const txItems: StatListItem[] = stats.transactions.map((t) => {
    const amount = t.amount ?? 0;
    const isCredit = t.type === "credit";
    const gross = Math.abs(amount);
    const fee = gross * 0.15;
    const net = gross - fee;

    return {
      id: t.id,
      title: t.description || t.reason?.trim() || t.source?.trim() || "Movimentação",
      subtitle: t.source ? `Origem: ${t.source}` : undefined,
      meta: fmtDate(t.created_at),
      right: isCredit ? BRL(gross) : `-${BRL(gross)}`,
      amount_gross: gross,
      amount_fee: fee,
      amount_net: net,
    };
  });

  const dash = "—";

  return (
    <>
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-4 gap-4">
        <p className="text-[10px] font-black uppercase text-white/40 tracking-[0.2em] italic">Métricas e Desempenho</p>
        <div className="flex items-center gap-2 overflow-x-auto pb-2 md:pb-0 no-scrollbar">
          {[
            { label: 'Hoje', val: '1' },
            { label: '7 dias', val: '7' },
            { label: '15 dias', val: '15' },
            { label: '30 dias', val: '30' },
            { label: '90 dias', val: '90' }
          ].map(p => (
            <button
              key={p.val}
              onClick={() => setPeriod(p.val)}
              className={`px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest whitespace-nowrap transition-all border ${
                period === p.val 
                  ? 'bg-primary text-black border-primary' 
                  : 'bg-white/5 border-white/5 text-white/50 hover:bg-white/10'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          icon={<Briefcase className="w-5 h-5" />}
          label="Ativos"
          value={stats.loading ? dash : String(filterByPeriod(stats.activeOrders).length)}
          color="text-blue-400"
          onClick={() => setOpenKey("ativos")}
        />
        <StatCard
          icon={<CheckCircle2 className="w-5 h-5" />}
          label="Concluídos"
          value={stats.loading ? dash : String(filterByPeriod(stats.doneOrders).length)}
          color="text-primary"
          onClick={() => setOpenKey("concluidos")}
        />
        <StatCard
          icon={<Star className="w-5 h-5" />}
          label="Rating"
          value={stats.loading ? dash : stats.ratingAvg !== null ? stats.ratingAvg.toFixed(1) : "0.0"}
          color="text-amber-400"
          onClick={() => setOpenKey("rating")}
        />
        <StatCard
          icon={<DollarSign className="w-5 h-5" />}
          label="Saldo PIX"
          value={stats.loading ? dash : BRL(stats.balance)} 
          color="text-emerald-400"
          onClick={() => setOpenKey("saldo")}
          showChart
          chartData={filterByPeriod(stats.transactions).map(t => t.amount ?? 0).reverse()}
        />
      </div>

      <div className="mt-4 flex gap-2">
        <button 
          onClick={() => setShowPixModal(true)}
          className="px-4 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-[10px] font-black text-emerald-400 uppercase tracking-widest hover:bg-emerald-500/20 transition-all flex items-center gap-2"
        >
          <QrCode className="w-4 h-4" /> Receber PIX
        </button>
      </div>

      <StatDetailsModal
        open={openKey === "ativos"}
        onOpenChange={(v) => !v && setOpenKey(null)}
        title="Trabalhos ativos"
        emptyLabel="Nenhum trabalho ativo no momento."
        loading={stats.loading}
        items={orderItems(stats.activeOrders)}
      />
      <StatDetailsModal
        open={openKey === "concluidos"}
        onOpenChange={(v) => !v && setOpenKey(null)}
        title="Trabalhos concluídos"
        emptyLabel="Nenhum trabalho concluído ainda."
        loading={stats.loading}
        items={orderItems(stats.doneOrders)}
      />
      <StatDetailsModal
        open={openKey === "rating"}
        onOpenChange={(v) => !v && setOpenKey(null)}
        title="Minhas avaliações"
        emptyLabel="Você ainda não recebeu avaliações."
        loading={stats.loading}
        items={reviewItems}
      />
      <StatDetailsModal
        open={openKey === "saldo"}
        onOpenChange={(v) => !v && setOpenKey(null)}
        title="Extrato de moedas"
        emptyLabel="Nenhuma movimentação registrada."
        loading={stats.loading}
        items={txItems}
      />

      {/* O modal de PIX agora é gerenciado globalmente no layout AuthenticatedLayout */}

    </>
  );
}


function StatCard({ icon, label, value, color, onClick, showChart, chartData }: any) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="text-left bg-black/40 border border-white/5 p-4 rounded-2xl flex flex-col gap-1 relative overflow-hidden hover:border-primary/30 transition-all group"
    >
      <div className={`w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center ${color} mb-2 group-hover:scale-110 transition-transform`}>{icon}</div>
      <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">{label}</span>
      <span className="text-xl font-black text-white italic">{value}</span>
      
      {showChart && chartData && chartData.length > 1 && (
        <div className="absolute right-2 bottom-2 w-16 h-8 opacity-40 group-hover:opacity-100 transition-opacity">
          <svg viewBox={`0 0 ${chartData.length - 1} 10`} className="w-full h-full overflow-visible">
            <polyline
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className={color}
              points={chartData
                .map((v: number, i: number) => {
                  const max = Math.max(...chartData, 1);
                  const min = Math.min(...chartData, 0);
                  const y = max === min ? 5 : 10 - ((v - min) / (max - min)) * 10;
                  return `${i},${y}`;
                })
                .join(" ")}
            />
          </svg>
        </div>
      )}

      <div className={`absolute -right-2 -bottom-2 opacity-5 ${color} scale-150`}>{icon}</div>
    </button>
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

