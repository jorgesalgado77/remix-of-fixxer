import { createFileRoute, useNavigate, Link } from '@tanstack/react-router';
import { 
  BookOpen, 
  Package, 
  Plus, 
  TrendingUp, 
  ChevronRight, 
  LayoutGrid,
  Mail,

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
import { useState, useEffect, useMemo } from 'react';
import { supabaseExternal } from '@/lib/supabaseExternal';
import { InfoOffer, getProductOffers, updateOfferStatus, createInfoOffer } from '@/lib/info-products/offer-service';

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
import { 
  getCreatorSalesStats, 
  getCreatorSalesList, 
  exportSalesCSV, 
  getSaleDetails,
  getCreatorCoupons,
  upsertInfoCoupon,
  getCouponAnalytics,
  InfoCoupon
} from '@/lib/info-products/v2-monetization';

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
  const [activeTab, setActiveTab] = useState<'products' | 'sales' | 'analytics' | 'coupons' | 'offers'>('products');
  const [isCreating, setIsCreating] = useState(false);

  return (
    <div className="min-h-screen bg-background pb-32 overflow-x-hidden">
      <ProfileHeader 
        role="prestador" 
        title="CREATOR STUDIO" 
        subtitle="Gestão de Info Produtos e Vendas" 
        hideSidebarCard 
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
              <TabButton 
                active={activeTab === 'offers'} 
                onClick={() => setActiveTab('offers')}
                icon={<DollarSign className="w-4 h-4 text-emerald-400" />}
                label="Ofertas"
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
            {activeTab === 'coupons' && <CouponDashboard />}
            {activeTab === 'offers' && <OfferDashboard />}



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
  const navigate = useNavigate();
  const userId = useCurrentUserId();

  const [stats, setStats] = useState<any>(null);
  const [salesData, setSalesData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedSale, setSelectedSale] = useState<any>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [loadingDetails, setLoadingDetails] = useState(false);
  
  const [filters, setFilters] = useState({
    status: 'ALL',
    period: 'last_30_days',
    startDate: '',
    endDate: '',
    page: 0,
    pageSize: 10
  });

  const getPeriodDates = (period: string) => {
    const now = new Date();
    let start = new Date();
    
    switch (period) {
      case 'today':
        start.setHours(0, 0, 0, 0);
        break;
      case 'last_7_days':
        start.setDate(now.getDate() - 7);
        break;
      case 'last_30_days':
        start.setDate(now.getDate() - 30);
        break;
      case 'current_month':
        start = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      default:
        return { start: '', end: '' };
    }
    
    return {
      start: start.toISOString(),
      end: now.toISOString()
    };
  };

  const loadData = async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const periodDates = filters.period !== 'custom' ? getPeriodDates(filters.period) : { start: filters.startDate, end: filters.endDate };
      
      const [s, list] = await Promise.all([
        getCreatorSalesStats(userId, periodDates.start ? periodDates : undefined),
        getCreatorSalesList(userId, {
          ...filters,
          startDate: periodDates.start,
          endDate: periodDates.end
        })
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
  }, [userId, filters.status, filters.period, filters.startDate, filters.endDate, filters.page]);

  const handleSaleClick = async (saleId: string) => {
    setLoadingDetails(true);
    setIsDetailsOpen(true);
    try {
      const details = await getSaleDetails(saleId);
      setSelectedSale(details);
    } catch (error) {
      console.error("Erro ao carregar detalhes da venda:", error);
      toast.error("Erro ao carregar detalhes da venda.");
      setIsDetailsOpen(false);
    } finally {
      setLoadingDetails(false);
    }
  };


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
        <div className="p-6 border-b border-white/10 space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-black text-white uppercase italic tracking-tighter">Histórico de Transações</h3>
              <p className="text-xs text-muted-foreground">Acompanhe detalhadamente cada venda realizada.</p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <select 
                className="bg-white/5 border border-white/10 rounded-xl text-xs font-bold text-white px-3 h-9 focus:ring-primary/40 outline-none"
                value={filters.period}
                onChange={(e) => setFilters(prev => ({ ...prev, period: e.target.value, page: 0 }))}
              >
                <option value="today">Hoje</option>
                <option value="last_7_days">Últimos 7 dias</option>
                <option value="last_30_days">Últimos 30 dias</option>
                <option value="current_month">Mês Atual</option>
                <option value="custom">Personalizado</option>
              </select>

              {filters.period === 'custom' && (
                <div className="flex items-center gap-2">
                  <Input 
                    type="date" 
                    className="h-9 bg-white/5 border-white/10 rounded-xl text-xs w-32"
                    value={filters.startDate}
                    onChange={(e) => setFilters(prev => ({ ...prev, startDate: e.target.value, page: 0 }))}
                  />
                  <Input 
                    type="date" 
                    className="h-9 bg-white/5 border-white/10 rounded-xl text-xs w-32"
                    value={filters.endDate}
                    onChange={(e) => setFilters(prev => ({ ...prev, endDate: e.target.value, page: 0 }))}
                  />
                </div>
              )}

              <select 
                className="bg-white/5 border border-white/10 rounded-xl text-xs font-bold text-white px-3 h-9 focus:ring-primary/40 outline-none"
                value={filters.status}
                onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value, page: 0 }))}
              >
                <option value="ALL">Todos os Status</option>
                <option value="PAID">Aprovada</option>
                <option value="PENDING">Pendente</option>
                <option value="FAILED">Falhou</option>
                <option value="CANCELLED">Cancelada</option>
                <option value="REFUNDED">Reembolsada</option>
              </select>

              <Button 
                variant="outline" 
                size="sm" 
                className="rounded-xl bg-white/5 border-white/10 text-xs font-bold uppercase tracking-widest gap-2"
                onClick={handleExport}
              >
                <Download className="w-3 h-3" />
                Exportar CSV
              </Button>
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
                         onClick={() => handleSaleClick(sale.id)}
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
      <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <DialogContent className="max-w-2xl bg-[#0F172A] border-white/10 text-white p-0 overflow-hidden rounded-[32px]">
          <DialogHeader className="p-6 border-b border-white/10 bg-white/5">
            <DialogTitle className="text-xl font-black uppercase italic tracking-tighter">Detalhes da Transação</DialogTitle>
            <DialogDescription className="text-muted-foreground text-xs uppercase tracking-widest font-bold">Informações completas da venda e comprador.</DialogDescription>
          </DialogHeader>

          {loadingDetails ? (
            <div className="p-20 flex flex-col items-center justify-center gap-4">
              <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
              <p className="text-xs font-black uppercase tracking-widest text-muted-foreground animate-pulse">Carregando dados reais...</p>
            </div>
          ) : selectedSale && (
            <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto no-scrollbar">
              {/* Resumo Principal */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white/5 p-4 rounded-2xl border border-white/10">
                  <p className="text-[10px] text-muted-foreground font-black uppercase tracking-widest mb-1">Status do Pagamento</p>
                  <StatusBadge status={selectedSale.status} />
                </div>
                <div className="bg-white/5 p-4 rounded-2xl border border-white/10 text-right">
                  <p className="text-[10px] text-muted-foreground font-black uppercase tracking-widest mb-1">Data da Venda</p>
                  <p className="text-sm font-bold">{new Date(selectedSale.created_at).toLocaleDateString()} às {new Date(selectedSale.created_at).toLocaleTimeString()}</p>
                </div>
              </div>

              {/* Seção Produto */}
              <div className="space-y-3">
                <h4 className="text-[10px] font-black text-primary uppercase tracking-widest">Produto & Entrega</h4>
                <div className="bg-white/5 p-4 rounded-2xl border border-white/10 flex items-center gap-4">
                  <div className="w-16 h-16 rounded-xl bg-white/10 overflow-hidden flex-shrink-0">
                    {selectedSale.info_products?.thumbnail_url ? (
                      <img src={selectedSale.info_products.thumbnail_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <Package className="w-6 h-6 m-auto text-muted-foreground/30" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-white truncate">{selectedSale.info_products?.title}</p>
                    <p className="text-xs text-muted-foreground">ID: {selectedSale.product_id}</p>
                    <div className="flex items-center gap-2 mt-2">
                       <Button 
                         size="sm" 
                         variant="outline" 
                         className="h-7 text-[10px] font-black rounded-lg bg-white/5 border-white/10 px-3 uppercase tracking-widest"
                         onClick={() => navigate({ to: `/marketplace/${selectedSale.product_id}` as any })}
                       >
                         Ver Produto
                       </Button>
                       <Button 
                         size="sm" 
                         className="h-7 text-[10px] font-black rounded-lg bg-primary text-primary-foreground px-3 uppercase tracking-widest"
                         onClick={() => navigate({ to: '/biblioteca' })}
                       >
                         Ver Entitlement
                       </Button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Seção Financeira */}
              <div className="space-y-3">
                <h4 className="text-[10px] font-black text-primary uppercase tracking-widest">Valores & Taxas</h4>
                <div className="bg-white/5 rounded-2xl border border-white/10 divide-y divide-white/5 overflow-hidden">
                  <div className="p-4 flex justify-between items-center">
                    <span className="text-xs text-muted-foreground font-bold uppercase tracking-widest">Valor Original</span>
                    <span className="text-sm font-bold text-white">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(selectedSale.amount_original)}</span>
                  </div>
                  {selectedSale.amount_discount > 0 && (
                    <div className="p-4 flex justify-between items-center bg-amber-500/5">
                      <span className="text-xs text-amber-400 font-bold uppercase tracking-widest flex items-center gap-1">
                        <Zap className="w-3 h-3" /> Desconto (Cupom)
                      </span>
                      <span className="text-sm font-bold text-amber-400">-{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(selectedSale.amount_discount)}</span>
                    </div>
                  )}
                  <div className="p-4 flex justify-between items-center">
                    <span className="text-xs text-muted-foreground font-bold uppercase tracking-widest">Valor Pago (Bruto)</span>
                    <span className="text-sm font-bold text-white">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(selectedSale.amount_paid)}</span>
                  </div>
                  <div className="p-4 flex justify-between items-center">
                    <span className="text-xs text-red-400 font-bold uppercase tracking-widest">Taxa FIXXER (15%)</span>
                    <span className="text-sm font-bold text-red-400">-{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(selectedSale.fixxer_fee)}</span>
                  </div>
                  <div className="p-4 flex justify-between items-center bg-primary/10">
                    <span className="text-xs text-primary font-black uppercase tracking-widest">Receita Líquida</span>
                    <span className="text-lg font-black text-primary italic tracking-tighter">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(selectedSale.amount_net)}</span>
                  </div>
                </div>
              </div>

              {/* Seção Comprador */}
              <div className="space-y-3">
                <h4 className="text-[10px] font-black text-primary uppercase tracking-widest">Dados do Comprador</h4>
                <div className="bg-white/5 p-4 rounded-2xl border border-white/10 flex items-center gap-4">
                   <div className="w-10 h-10 rounded-full bg-white/10 overflow-hidden">
                      {selectedSale.profiles?.avatar_url ? (
                        <img src={selectedSale.profiles.avatar_url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <Users className="w-5 h-5 m-auto text-muted-foreground/30" />
                      )}
                   </div>
                   <div>
                      <p className="text-sm font-bold text-white">{selectedSale.profiles?.display_name || 'Usuário Fixxer'}</p>
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <Mail className="w-3 h-3" /> {selectedSale.profiles?.email}
                      </p>
                   </div>
                </div>
              </div>
              
              <div className="text-[9px] text-muted-foreground/50 text-center pt-4 uppercase font-bold tracking-widest">
                Transação ID: {selectedSale.id} • Processado via ASAAS Gateway
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
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

function CouponDashboard() {
  const userId = useCurrentUserId();
  const [coupons, setCoupons] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedCoupon, setSelectedCoupon] = useState<any>(null);

  const loadCoupons = async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const data = await getCreatorCoupons(userId);
      setCoupons(data || []);
    } catch (error) {
      toast.error("Erro ao carregar cupons.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCoupons();
  }, [userId]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black text-white uppercase italic tracking-tighter">Gestão de Cupons</h2>
          <p className="text-muted-foreground text-sm">Crie descontos estratégicos para seus produtos.</p>
        </div>
        
        <Button 
          onClick={() => {
            setSelectedCoupon(null);
            setIsFormOpen(true);
          }}
          className="bg-primary text-primary-foreground font-black px-6 py-6 rounded-2xl shadow-[0_0_20px_rgba(0,255,135,0.3)] hover:scale-105 transition-all uppercase tracking-widest text-xs gap-2"
          title="Criar novo cupom de desconto real"
        >
          <Plus className="w-4 h-4" />
          Criar Cupom
        </Button>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1,2,3].map(i => <Skeleton key={i} className="h-48 rounded-[32px]" />)}
        </div>
      ) : coupons.length === 0 ? (
        <div className="py-20 text-center space-y-4 bg-white/[0.02] border border-dashed border-white/10 rounded-[32px]">
          <Zap className="w-12 h-12 text-muted-foreground/30 mx-auto" />
          <p className="text-muted-foreground font-bold uppercase tracking-widest text-sm">Nenhum cupom criado.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {coupons.map((coupon) => (
            <div key={coupon.id} className="bg-white/[0.03] border border-white/10 p-6 rounded-[32px] space-y-4 relative group hover:border-primary/30 transition-all shadow-xl">
              <div className="flex justify-between items-start">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xl font-black text-white italic tracking-tighter uppercase">{coupon.code}</span>
                    <Badge variant="outline" className="text-[8px] font-black uppercase tracking-widest bg-primary/10 text-primary border-primary/20">
                      {coupon.status}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground font-bold mt-1">{coupon.name}</p>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="rounded-xl hover:bg-white/5">
                      <MoreVertical className="w-4 h-4 text-muted-foreground" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="bg-[#1A1F2C] border-white/10 text-white rounded-xl">
                    <DropdownMenuItem 
                      className="gap-2 focus:bg-white/5 cursor-pointer text-xs uppercase font-black tracking-widest"
                      onClick={() => {
                        setSelectedCoupon(coupon);
                        setIsFormOpen(true);
                      }}
                      title="Editar regras e validade do cupom"
                    >
                      <Edit className="w-3 h-3" /> Editar
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      className="gap-2 focus:bg-white/5 cursor-pointer text-xs uppercase font-black tracking-widest text-amber-400"
                      title="Pausar uso deste cupom temporariamente"
                    >
                      <Pause className="w-3 h-3" /> Pausar
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      className="gap-2 focus:bg-white/5 cursor-pointer text-xs uppercase font-black tracking-widest text-red-500"
                      title="Arquivar cupom permanentemente"
                    >
                      <Archive className="w-3 h-3" /> Arquivar
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-2 border-t border-white/5">
                <div>
                  <p className="text-[8px] text-muted-foreground font-black uppercase tracking-widest">Desconto</p>
                  <p className="text-sm font-black text-white italic">
                    {coupon.discount_type === 'PERCENTAGE' ? `${coupon.discount_value}%` : `R$ ${coupon.discount_value}`}
                  </p>
                </div>
                <div>
                  <p className="text-[8px] text-muted-foreground font-black uppercase tracking-widest">Usos</p>
                  <p className="text-sm font-black text-white italic">{coupon.usage_count} {coupon.max_uses ? `/ ${coupon.max_uses}` : ''}</p>
                </div>
              </div>

              {coupon.product_id ? (
                <div className="bg-white/5 p-3 rounded-2xl">
                  <p className="text-[8px] text-muted-foreground font-black uppercase tracking-widest mb-1">Restrito ao Produto</p>
                  <p className="text-[10px] font-bold text-white truncate">{coupon.info_products?.title}</p>
                </div>
              ) : (
                <div className="bg-emerald-500/10 p-3 rounded-2xl border border-emerald-500/20">
                  <p className="text-[10px] font-black text-emerald-400 uppercase tracking-widest italic">Válido em todo catálogo</p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="bg-[#0f172a] border-white/10 text-white max-w-2xl rounded-[32px] overflow-y-auto max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black italic uppercase tracking-tighter">
              {selectedCoupon ? 'Editar Cupom' : 'Novo Cupom'}
            </DialogTitle>
            <DialogDescription className="text-muted-foreground text-xs uppercase font-bold tracking-widest">
              Defina as regras e validade do seu desconto real.
            </DialogDescription>
          </DialogHeader>
          
          <CouponForm 
            initialData={selectedCoupon} 
            onSuccess={() => {
              setIsFormOpen(false);
              loadCoupons();
            }}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}

function CouponForm({ initialData, onSuccess }: { initialData?: any; onSuccess: () => void }) {
  const userId = useCurrentUserId();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    code: initialData?.code || '',
    name: initialData?.name || '',
    description: initialData?.description || '',
    discount_type: initialData?.discount_type || 'PERCENTAGE',
    discount_value: initialData?.discount_value || 0,
    product_id: initialData?.product_id || null,
    max_uses: initialData?.max_uses || null,
    min_purchase_value: initialData?.min_purchase_value || 0,
    status: initialData?.status || 'ACTIVE'
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId) return;
    setLoading(true);
    try {
      await upsertInfoCoupon({
        ...formData,
        id: initialData?.id,
        creator_id: userId
      } as any);
      toast.success("Cupom salvo com sucesso!");
      onSuccess();
    } catch (error) {
      toast.error("Erro ao salvar cupom. Verifique se o código já existe.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 pt-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest px-1">Código do Cupom</label>
          <Input 
            value={formData.code}
            onChange={e => setFormData(prev => ({ ...prev, code: e.target.value }))}
            placeholder="EX: FIXXER20"
            required
            className="bg-white/5 border-white/10 rounded-2xl h-12 font-black uppercase tracking-widest placeholder:text-muted-foreground/30"
          />
        </div>
        <div className="space-y-2">
          <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest px-1">Nome Interno</label>
          <Input 
            value={formData.name}
            onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
            placeholder="Promoção de Lançamento"
            required
            className="bg-white/5 border-white/10 rounded-2xl h-12 font-bold"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="space-y-2 col-span-2">
          <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest px-1">Tipo de Desconto</label>
          <select 
            value={formData.discount_type}
            onChange={e => setFormData(prev => ({ ...prev, discount_type: e.target.value as any }))}
            className="w-full bg-white/5 border border-white/10 rounded-2xl h-12 px-4 font-bold text-white outline-none focus:ring-1 ring-primary/50"
          >
            <option value="PERCENTAGE">Porcentagem (%)</option>
            <option value="FIXED_AMOUNT">Valor Fixo (R$)</option>
          </select>
        </div>
        <div className="space-y-2 col-span-2">
          <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest px-1">Valor do Desconto</label>
          <Input 
            type="number"
            value={formData.discount_value}
            onChange={e => setFormData(prev => ({ ...prev, discount_value: Number(e.target.value) }))}
            required
            className="bg-white/5 border-white/10 rounded-2xl h-12 font-black italic tracking-tighter text-xl"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest px-1">Limite de Usos</label>
          <Input 
            type="number"
            value={formData.max_uses || ''}
            onChange={e => setFormData(prev => ({ ...prev, max_uses: e.target.value ? Number(e.target.value) : null }))}
            placeholder="Ilimitado"
            className="bg-white/5 border-white/10 rounded-2xl h-12 font-bold"
          />
        </div>
        <div className="space-y-2">
          <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest px-1">Compra Mínima (R$)</label>
          <Input 
            type="number"
            value={formData.min_purchase_value}
            onChange={e => setFormData(prev => ({ ...prev, min_purchase_value: Number(e.target.value) }))}
            className="bg-white/5 border-white/10 rounded-2xl h-12 font-bold"
          />
        </div>
      </div>

      <div className="pt-4 flex gap-3">
        <Button 
          type="submit" 
          disabled={loading}
          className="flex-1 bg-primary text-primary-foreground font-black py-7 rounded-2xl shadow-[0_0_20px_rgba(0,255,135,0.2)] uppercase tracking-widest text-xs"
        >
          {loading ? "Salvando..." : "Confirmar Cupom Real"}
        </Button>
      </div>
    </form>
  );
}


