import { createFileRoute, useNavigate, Link } from '@tanstack/react-router';
import { 
  BookOpen, 
  Package, 
  Plus, 
  TrendingUp, 
  ChevronRight, 
  LayoutGrid,
  Settings,
  AlertCircle,
  Clock,
  CheckCircle2,
  MoreVertical,
  Edit,
  Eye,
  Trash2,
  Pause,
  Play,
  Archive,
  Zap,
  ArrowLeft,
  DollarSign,
  Users,
  Calendar as CalendarIcon,
  Download,
  Filter as FilterIcon,
  Search as SearchIcon,
} from 'lucide-react';
import { ProfileHeader } from '@/components/ProfileHeader';
import { PanelActions } from '@/components/PanelActions';
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import { CreatorProductForm } from '@/components/info-products/CreatorProductForm';
import { useCurrentUserId } from '@/lib/current-user';
import { getCreatorSalesStats, getCreatorSalesList, exportSalesCSV, getSaleDetails } from '@/lib/info-products/v2-monetization';
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';


export const Route = createFileRoute('/_authenticated/infoprodutos')({
  component: CreatorStudioPage,
});

function CreatorStudioPage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'products' | 'sales' | 'analytics' | 'coupons'>('products');
  const [isCreating, setIsCreating] = useState(false);

  return (
    <div className="min-h-screen bg-background pb-32 overflow-x-hidden">
      <ProfileHeader 
        role="prestador" 
        title="CREATOR STUDIO" 
        subtitle="Gestão de Info Produtos e Vendas" 
        hideSidebarCard 
        actions={<PanelActions role="prestador" />}
      />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-8 relative z-10 space-y-8">
        {isCreating ? (
          <CreatorProductForm 
            onClose={() => setIsCreating(false)} 
            onSave={(data) => {
              toast.success("Produto salvo com sucesso!");
              setIsCreating(false);
            }} 
          />
        ) : (
          <>
            {/* MENU NAVEGAÇÃO CREATOR */}
            <div className="flex items-center gap-2 p-1.5 bg-white/[0.03] border border-white/10 rounded-2xl w-fit backdrop-blur-xl overflow-x-auto max-w-full no-scrollbar">
              <TabButton 
                active={activeTab === 'products'} 
                onClick={() => setActiveTab('products')}
                icon={<Package className="w-4 h-4" />}
                label="Produtos"
              />
              <TabButton 
                active={activeTab === 'sales'} 
                onClick={() => setActiveTab('sales')}
                icon={<TrendingUp className="w-4 h-4" />}
                label="Vendas"
              />
              <TabButton 
                active={activeTab === 'analytics'} 
                onClick={() => setActiveTab('analytics')}
                icon={<LayoutGrid className="w-4 h-4" />}
                label="Analytics"
              />
              <TabButton 
                active={activeTab === 'coupons'} 
                onClick={() => setActiveTab('coupons')}
                icon={<Zap className="w-4 h-4 text-amber-400" />}
                label="Cupons"
              />
            </div>

            {activeTab === 'products' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-2xl font-black text-white uppercase italic tracking-tighter">Seus Info Produtos</h2>
                    <p className="text-muted-foreground text-sm">Gerencie seus e-books, aulas e cursos digitais.</p>
                  </div>
                  
                  <Button 
                    onClick={() => setIsCreating(true)}
                    className="bg-primary text-primary-foreground font-black px-6 py-6 rounded-2xl shadow-[0_0_20px_rgba(0,255,135,0.3)] hover:scale-105 transition-all uppercase tracking-widest text-xs gap-2"
                    title="Criar novo info produto — use o Assistente IA para acelerar seu trabalho"
                  >
                    <Plus className="w-4 h-4" />
                    Criar Produto
                  </Button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                   <EmptyState />
                </div>
              </div>
            )}

            {activeTab === 'analytics' && (
              <div className="space-y-8">
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  <MetricCard 
                    label="Receita Bruta" 
                    value="R$ 0,00" 
                    icon={<TrendingUp className="text-emerald-400" />} 
                    tip="Total acumulado de vendas antes das taxas."
                  />
                  <MetricCard 
                    label="Receita Líquida" 
                    value="R$ 0,00" 
                    icon={<CheckCircle2 className="text-primary" />} 
                    tip="Valor disponível para saque (85% do bruto)."
                  />
                  <MetricCard 
                    label="Conversão" 
                    value="0%" 
                    icon={<Zap className="text-amber-400" />} 
                    tip="Percentual de visitantes que realizaram a compra."
                  />
                  <MetricCard 
                    label="Avaliações" 
                    value="0.0" 
                    icon={<LayoutGrid className="text-blue-400" />} 
                    tip="Média de satisfação dos seus alunos."
                  />
                </div>
                
                <div className="py-20 text-center space-y-4 bg-white/[0.02] border border-dashed border-white/10 rounded-[32px]">
                  <TrendingUp className="w-12 h-12 text-muted-foreground/30 mx-auto" />
                  <p className="text-muted-foreground font-bold uppercase tracking-widest text-sm text-center px-4">Gráficos de desempenho em processamento...</p>
                </div>
              </div>
            )}
            
            {activeTab === 'sales' && <SalesDashboard />}
            {activeTab === 'coupons' && (
               <div className="py-20 text-center space-y-4 bg-white/[0.02] border border-dashed border-white/10 rounded-[32px]">
                 <Clock className="w-12 h-12 text-muted-foreground/30 mx-auto" />
                 <p className="text-muted-foreground font-bold uppercase tracking-widest text-sm">Gestão de Cupons em breve.</p>
               </div>
            )}

          </>
        )}
      </main>

    </div>
  );
}

function MetricCard({ label, value, icon, tip }: { label: string; value: string; icon: React.ReactNode; tip: string }) {
  return (
    <div className="bg-white/[0.03] border border-white/10 p-5 rounded-[24px] space-y-3 relative group overflow-hidden shadow-xl" title={tip}>
      <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center">
        {icon}
      </div>
      <div>
        <p className="text-[10px] text-muted-foreground font-black uppercase tracking-widest">{label}</p>
        <p className="text-xl font-black text-white italic tracking-tighter mt-0.5">{value}</p>
      </div>
      <div className="absolute top-0 right-0 p-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <AlertCircle className="w-3 h-3 text-muted-foreground/50" />
      </div>
    </div>
  );
}

function TabButton({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-xs uppercase tracking-widest transition-all ${
        active 
          ? 'bg-primary text-primary-foreground shadow-[0_0_15px_rgba(0,255,135,0.2)]' 
          : 'text-muted-foreground hover:text-white hover:bg-white/5'
      }`}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}


function EmptyState() {
  return (
    <div className="col-span-full py-24 flex flex-col items-center justify-center text-center space-y-6 bg-white/[0.02] border border-dashed border-white/10 rounded-[40px]">
      <div className="w-20 h-20 bg-white/5 rounded-[32px] flex items-center justify-center text-muted-foreground/40">
        <BookOpen className="w-10 h-10" />
      </div>
      <div className="space-y-2 max-w-sm">
        <h3 className="text-xl font-bold text-white uppercase tracking-tight">Nenhum produto ainda</h3>
        <p className="text-sm text-muted-foreground">Você ainda não criou nenhum produto digital. Transforme seu conhecimento em renda passiva hoje mesmo.</p>
      </div>
    </div>
  );
}

function SalesDashboard() {
  const userId = useCurrentUserId();
  const [stats, setStats] = useState<any>(null);
  const [salesData, setSalesData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    status: 'ALL',
    page: 0,
    pageSize: 10
  });

  const loadData = async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const [s, list] = await Promise.all([
        getCreatorSalesStats(userId),
        getCreatorSalesList(userId, filters)
      ]);
      setStats(s);
      setSalesData(list);
    } catch (error) {
      console.error("Erro ao carregar vendas:", error);
      toast.error("Erro ao carregar dados de vendas.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [userId, filters]);

  const handleExport = async () => {
    if (!userId) return;
    try {
      const csv = await exportSalesCSV(userId, {});
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.setAttribute('hidden', '');
      a.setAttribute('href', url);
      a.setAttribute('download', `vendas-${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (error) {
      toast.error("Erro ao exportar CSV.");
    }
  };

  if (loading && !stats) {
    return (
      <div className="space-y-8 animate-pulse">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-32 rounded-[24px]" />)}
        </div>
        <Skeleton className="h-96 rounded-[32px]" />
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-20">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard 
          label="Vendas Totais" 
          value={stats?.totalSales?.toString() || "0"} 
          icon={<Package className="text-blue-400" />} 
          tip="Número total de transações registradas."
        />
        <MetricCard 
          label="Vendas Aprovadas" 
          value={stats?.approvedSales?.toString() || "0"} 
          icon={<CheckCircle2 className="text-emerald-400" />} 
          tip="Vendas com pagamento confirmado."
        />
        <MetricCard 
          label="Receita Líquida" 
          value={new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(stats?.revenueNet || 0)} 
          icon={<DollarSign className="text-primary" />} 
          tip="Valor total já descontando a taxa FIXXER."
        />
        <MetricCard 
          label="Ticket Médio" 
          value={new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(stats?.avgTicket || 0)} 
          icon={<TrendingUp className="text-amber-400" />} 
          tip="Valor médio das vendas aprovadas."
        />
      </div>

      <div className="bg-white/[0.02] border border-white/10 rounded-[32px] overflow-hidden">
        <div className="p-6 border-b border-white/10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h3 className="text-lg font-black text-white uppercase italic tracking-tighter">Histórico de Transações</h3>
            <p className="text-xs text-muted-foreground">Acompanhe detalhadamente cada venda realizada.</p>
          </div>
          <div className="flex items-center gap-3">
            <Button 
              variant="outline" 
              size="sm" 
              className="rounded-xl bg-white/5 border-white/10 text-xs font-bold uppercase tracking-widest gap-2"
              onClick={handleExport}
            >
              <Download className="w-3 h-3" />
              Exportar CSV
            </Button>
            <div className="relative">
              <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground" />
              <Input 
                placeholder="Buscar venda..." 
                className="pl-8 h-9 bg-white/5 border-white/10 rounded-xl text-xs w-48 focus:ring-primary/40"
              />
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-white/5 border-b border-white/10">
                <th className="px-6 py-4 text-[10px] font-black text-muted-foreground uppercase tracking-widest">Produto / Data</th>
                <th className="px-6 py-4 text-[10px] font-black text-muted-foreground uppercase tracking-widest">Comprador</th>
                <th className="px-6 py-4 text-[10px] font-black text-muted-foreground uppercase tracking-widest">Valor</th>
                <th className="px-6 py-4 text-[10px] font-black text-muted-foreground uppercase tracking-widest">Líquido</th>
                <th className="px-6 py-4 text-[10px] font-black text-muted-foreground uppercase tracking-widest">Status</th>
                <th className="px-6 py-4 text-[10px] font-black text-muted-foreground uppercase tracking-widest"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {salesData?.data?.length > 0 ? (
                salesData.data.map((sale: any) => (
                  <tr key={sale.id} className="hover:bg-white/[0.02] transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="text-sm font-bold text-white truncate max-w-[200px]">{sale.info_products?.title || 'Produto Removido'}</span>
                        <span className="text-[10px] text-muted-foreground font-medium">{new Date(sale.created_at).toLocaleDateString()} às {new Date(sale.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                         <div className="w-6 h-6 rounded-full bg-white/10 overflow-hidden flex-shrink-0">
                           {sale.profiles?.avatar_url ? (
                             <img src={sale.profiles.avatar_url} alt="" className="w-full h-full object-cover" />
                           ) : (
                             <Users className="w-3 h-3 m-auto text-muted-foreground/40" />
                           )}
                         </div>
                         <span className="text-xs font-medium text-white/80">{sale.profiles?.display_name || 'Comprador'}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-xs font-bold text-white">
                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(sale.amount_paid)}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-xs font-bold text-primary">
                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(sale.amount_net)}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <StatusBadge status={sale.status} />
                    </td>
                    <td className="px-6 py-4 text-right">
                       <Button 
                         variant="ghost" 
                         size="icon" 
                         className="opacity-0 group-hover:opacity-100 transition-opacity rounded-lg hover:bg-white/10"
                         title="Ver detalhes da venda"
                       >
                         <ChevronRight className="w-4 h-4 text-muted-foreground" />
                       </Button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="px-6 py-20 text-center">
                    <div className="flex flex-col items-center gap-3 opacity-40">
                      <TrendingUp className="w-10 h-10" />
                      <p className="text-xs font-bold uppercase tracking-widest">Nenhuma venda encontrada</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {salesData?.count > filters.pageSize && (
          <div className="p-4 border-t border-white/10 flex items-center justify-between">
            <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">
              Mostrando {salesData.data.length} de {salesData.count} vendas
            </p>
            <div className="flex items-center gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                disabled={filters.page === 0}
                onClick={() => setFilters(prev => ({ ...prev, page: prev.page - 1 }))}
                className="h-8 text-[10px] font-black rounded-lg border-white/10"
              >
                Anterior
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                disabled={(filters.page + 1) * filters.pageSize >= salesData.count}
                onClick={() => setFilters(prev => ({ ...prev, page: prev.page + 1 }))}
                className="h-8 text-[10px] font-black rounded-lg border-white/10"
              >
                Próxima
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const configs: any = {
    PAID: { label: 'Aprovada', className: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' },
    PENDING: { label: 'Pendente', className: 'bg-amber-500/10 text-amber-400 border-amber-500/20' },
    FAILED: { label: 'Falhou', className: 'bg-red-500/10 text-red-400 border-red-500/20' },
    CANCELLED: { label: 'Cancelada', className: 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20' },
    REFUNDED: { label: 'Reembolsada', className: 'bg-blue-500/10 text-blue-400 border-blue-500/20' },
    EXPIRED: { label: 'Expirada', className: 'bg-orange-500/10 text-orange-400 border-orange-500/20' }
  };

  const config = configs[status] || { label: status, className: 'bg-white/10 text-white border-white/20' };

  return (
    <Badge variant="outline" className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md border ${config.className}`}>
      {config.label}
    </Badge>
  );
}

