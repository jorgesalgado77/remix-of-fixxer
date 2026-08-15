import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { 
  ShoppingBag, 
  Search, 
  Filter, 
  Calendar, 
  User, 
  Tag, 
  DollarSign, 
  ArrowRight,
  AlertCircle,
  CheckCircle,
  XCircle,
  FileText,
  Pause,
  Play,
  Archive,
  SearchCode,
  ArrowLeft,
  Settings,
  ShieldCheck
} from "lucide-react";
import { useState, useEffect } from "react";
import { 
  getAdminSalesList, 
  getAdminCouponList, 
  adminRefundSale,
  getGlobalMonetizationConfig,
  saveGlobalMonetizationConfig,
  updateCouponStatus
} from "@/lib/info-products/v2-monetization";
import { useIsAdmin } from "@/lib/current-user";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export const Route = createFileRoute("/_authenticated/admin/infoprodutos")({
  component: InfoAdminMasterPage,
});

function InfoAdminMasterPage() {
  const navigate = useNavigate();
  const { isAdmin, loading: adminLoading } = useIsAdmin();
  const [activeTab, setActiveTab] = useState<'sales' | 'coupons' | 'config'>('sales');
  const [sales, setSales] = useState<any[]>([]);
  const [coupons, setCoupons] = useState<any[]>([]);
  const [config, setConfig] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    period: 'all' as any,
    status: 'ALL'
  });

  useEffect(() => {
    if (!adminLoading && !isAdmin) {
      toast.error("Acesso restrito ao Administrador.");
      navigate({ to: "/feed" as any });
    }
  }, [isAdmin, adminLoading, navigate]);

  useEffect(() => {
    if (isAdmin) {
      loadData();
    }
  }, [activeTab, filters, isAdmin]);

  async function loadData() {
    setLoading(true);
    try {
      if (activeTab === 'sales') {
        const res = await getAdminSalesList(filters);
        setSales(res.data || []);
      } else if (activeTab === 'coupons') {
        const res = await getAdminCouponList();
        setCoupons(res || []);
      } else if (activeTab === 'config') {
        const res = await getGlobalMonetizationConfig();
        setConfig(res);
      }
    } catch (error) {
      console.error(error);
      toast.error("Erro ao carregar dados administrativos.");
    } finally {
      setLoading(false);
    }
  }

  const handleRefund = async (saleId: string) => {
    if (!confirm("Tem certeza que deseja estornar esta venda? O acesso do aluno será revogado.")) return;
    
    try {
      await adminRefundSale(saleId, "Solicitação Administrativa Master");
      toast.success("Venda estornada com sucesso.");
      loadData();
    } catch (error) {
      toast.error("Falha ao realizar estorno.");
    }
  };

  if (adminLoading) return null;
  if (!isAdmin) return null;

  return (
    <div className="p-8 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-primary mb-2">
            <ShoppingBag className="w-5 h-5" />
            <span className="text-xs font-black uppercase tracking-widest italic">Admin Master</span>
          </div>
          <h1 className="text-3xl font-black text-white tracking-tighter uppercase italic">Info Produtos & Vendas</h1>
        </div>

        <div className="flex bg-white/5 p-1 rounded-2xl border border-white/10">
          <button 
            onClick={() => setActiveTab('sales')}
            className={`px-6 py-2 rounded-xl text-xs font-bold uppercase tracking-widest transition-all ${activeTab === 'sales' ? 'bg-primary text-primary-foreground shadow-lg' : 'text-muted-foreground hover:text-white'}`}
          >
            Vendas
          </button>
          <button 
            onClick={() => setActiveTab('coupons')}
            className={`px-6 py-2 rounded-xl text-xs font-bold uppercase tracking-widest transition-all ${activeTab === 'coupons' ? 'bg-primary text-primary-foreground shadow-lg' : 'text-muted-foreground hover:text-white'}`}
          >
            Cupons
          </button>
          <button 
            onClick={() => setActiveTab('config')}
            className={`px-6 py-2 rounded-xl text-xs font-bold uppercase tracking-widest transition-all ${activeTab === 'config' ? 'bg-primary text-primary-foreground shadow-lg' : 'text-muted-foreground hover:text-white'}`}
          >
            Configurações
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      ) : (
        <div className="space-y-6">
          {activeTab === 'sales' && (
            <>
              {/* Filtros de Vendas */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-white/5 p-6 rounded-[32px] border border-white/10">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-2">Período</label>
                  <select 
                    value={filters.period}
                    onChange={(e) => setFilters({...filters, period: e.target.value})}
                    className="w-full bg-background border border-white/10 rounded-xl px-4 py-2.5 text-sm font-bold text-white focus:ring-2 focus:ring-primary outline-none"
                  >
                    <option value="all">Tudo</option>
                    <option value="today">Hoje</option>
                    <option value="7d">Últimos 7 dias</option>
                    <option value="30d">Últimos 30 dias</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-2">Status</label>
                  <select 
                    value={filters.status}
                    onChange={(e) => setFilters({...filters, status: e.target.value})}
                    className="w-full bg-background border border-white/10 rounded-xl px-4 py-2.5 text-sm font-bold text-white focus:ring-2 focus:ring-primary outline-none"
                  >
                    <option value="ALL">Todos os Status</option>
                    <option value="PAID">Pago</option>
                    <option value="PENDING">Pendente</option>
                    <option value="REFUNDED">Estornado</option>
                    <option value="CANCELLED">Cancelado</option>
                  </select>
                </div>
              </div>

              {/* Tabela de Vendas */}
              <div className="bg-card/50 backdrop-blur-xl border border-white/10 rounded-[40px] overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="border-b border-white/5 bg-white/5">
                        <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground italic">Comprador</th>
                        <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground italic">Produto / Criador</th>
                        <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground italic text-center">Data</th>
                        <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground italic text-right">Valor Bruto</th>
                        <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground italic text-center">Status</th>
                        <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground italic text-center">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {sales.map((sale) => (
                        <tr key={sale.id} className="group hover:bg-white/[0.02] transition-colors">
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-full bg-primary/20 flex items-center justify-center border border-primary/30">
                                <User className="w-4 h-4 text-primary" />
                              </div>
                              <div>
                                <div className="text-sm font-black text-white italic">{sale.profiles?.display_name || 'Usuário Fixxer'}</div>
                                <div className="text-[10px] text-muted-foreground font-bold uppercase">{sale.profiles?.email}</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="space-y-0.5">
                              <div className="text-sm font-bold text-white">{sale.info_products?.title}</div>
                              <div className="text-[10px] font-black text-primary uppercase tracking-tighter italic">Por: {sale.creator?.display_name}</div>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-center">
                            <div className="text-[11px] font-bold text-muted-foreground">
                              {format(new Date(sale.created_at), "dd MMM yyyy", { locale: ptBR })}
                            </div>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <div className="text-sm font-black text-white italic">R$ {Number(sale.amount_gross).toFixed(2)}</div>
                            {sale.amount_discount > 0 && (
                              <div className="text-[9px] font-bold text-red-400 uppercase">Desc: -R$ {Number(sale.amount_discount).toFixed(2)}</div>
                            )}
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex justify-center">
                              <span className={`px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border ${
                                sale.status === 'PAID' ? 'bg-green-500/10 text-green-500 border-green-500/20' :
                                sale.status === 'REFUNDED' ? 'bg-amber-500/10 text-amber-500 border-amber-500/20' :
                                'bg-white/5 text-muted-foreground border-white/10'
                              }`}>
                                {sale.status}
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex justify-center gap-2">
                              {sale.status === 'PAID' && (
                                <button 
                                  onClick={() => handleRefund(sale.id)}
                                  className="p-2 bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white rounded-xl transition-all group/btn border border-red-500/20"
                                  title="Estornar Venda"
                                >
                                  <AlertCircle className="w-4 h-4" />
                                </button>
                              )}
                              <button className="p-2 bg-white/5 hover:bg-primary text-muted-foreground hover:text-primary-foreground rounded-xl transition-all border border-white/5">
                                <SearchCode className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}

          {activeTab === 'coupons' && (
            <div className="bg-card/50 backdrop-blur-xl border border-white/10 rounded-[40px] overflow-hidden">
               <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="border-b border-white/5 bg-white/5">
                        <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground italic">Código / Nome</th>
                        <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground italic">Criador</th>
                        <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground italic text-center">Desconto</th>
                        <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground italic text-center">Uso / Limite</th>
                        <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground italic text-center">Status</th>
                        <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground italic text-center">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {coupons.map((coupon) => (
                        <tr key={coupon.id} className="group hover:bg-white/[0.02] transition-colors">
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center border border-primary/20">
                                <Tag className="w-4 h-4 text-primary" />
                              </div>
                              <div>
                                <div className="text-sm font-black text-white italic">{coupon.code}</div>
                                <div className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">{coupon.name}</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-sm font-bold text-white">{coupon.creator?.display_name || 'Desconhecido'}</div>
                            <div className="text-[10px] font-black text-primary uppercase tracking-tighter italic">Produto: {coupon.info_products?.title || 'Catálogo'}</div>
                          </td>
                          <td className="px-6 py-4 text-center">
                            <div className="text-sm font-black text-white italic">
                              {coupon.discount_type === 'PERCENTAGE' ? `${coupon.discount_value}%` : `R$ ${coupon.discount_value.toFixed(2)}`}
                            </div>
                          </td>
                          <td className="px-6 py-4 text-center">
                            <div className="text-[11px] font-black text-white italic">
                              {coupon.usage_count || 0} / {coupon.max_uses || '∞'}
                            </div>
                          </td>
                          <td className="px-6 py-4 text-center">
                             <span className={`px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border ${
                                coupon.status === 'ACTIVE' ? 'bg-green-500/10 text-green-500 border-green-500/20' :
                                'bg-white/5 text-muted-foreground border-white/10'
                              }`}>
                                {coupon.status}
                              </span>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex justify-center gap-2">
                              {coupon.status === 'ACTIVE' ? (
                                <button 
                                  onClick={async () => {
                                    await updateCouponStatus(coupon.id, 'PAUSED');
                                    loadData();
                                  }}
                                  className="p-2 bg-amber-500/10 hover:bg-amber-500 text-amber-500 hover:text-white rounded-xl transition-all border border-amber-500/20"
                                >
                                  <Pause className="w-4 h-4" />
                                </button>
                              ) : (
                                <button 
                                  onClick={async () => {
                                    await updateCouponStatus(coupon.id, 'ACTIVE');
                                    loadData();
                                  }}
                                  className="p-2 bg-green-500/10 hover:bg-green-500 text-green-500 hover:text-white rounded-xl transition-all border border-green-500/20"
                                >
                                  <Play className="w-4 h-4" />
                                </button>
                              )}
                              <button 
                                onClick={async () => {
                                  if (confirm("Arquivar este cupom?")) {
                                    await updateCouponStatus(coupon.id, 'EXHAUSTED');
                                    loadData();
                                  }
                                }}
                                className="p-2 bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white rounded-xl transition-all border border-red-500/20"
                              >
                                <Archive className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
            </div>
          )}

          {activeTab === 'config' && config && (
            <div className="max-w-3xl mx-auto bg-card/50 backdrop-blur-xl border border-white/10 p-10 rounded-[48px] space-y-8 shadow-2xl">
              <div className="text-center space-y-2">
                <div className="w-16 h-16 bg-blue-500/10 rounded-3xl flex items-center justify-center text-blue-500 mx-auto border border-blue-500/20 shadow-lg">
                  <Settings className="w-8 h-8" />
                </div>
                <h2 className="text-2xl font-black text-white italic uppercase tracking-tighter">Políticas de Monetização</h2>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground italic">Configuração Global de Info Produtos</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-3 bg-white/5 p-6 rounded-3xl border border-white/5">
                  <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Taxa FIXXER Padrão (%)</label>
                  <div className="relative">
                    <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-primary" />
                    <input 
                      type="number" 
                      value={config.defaultFixxerFee}
                      onChange={(e) => setConfig({...config, defaultFixxerFee: Number(e.target.value)})}
                      className="w-full bg-background border border-white/10 rounded-2xl pl-10 pr-4 py-3.5 text-sm font-black text-white focus:ring-2 focus:ring-primary outline-none transition-all"
                    />
                  </div>
                </div>

                <div className="space-y-3 bg-white/5 p-6 rounded-3xl border border-white/5">
                  <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Taxa Máxima FIXXER (%)</label>
                  <div className="relative">
                    <ShieldCheck className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-primary" />
                    <input 
                      type="number" 
                      value={config.maxFixxerFee}
                      onChange={(e) => setConfig({...config, maxFixxerFee: Number(e.target.value)})}
                      className="w-full bg-background border border-white/10 rounded-2xl pl-10 pr-4 py-3.5 text-sm font-black text-white focus:ring-2 focus:ring-primary outline-none transition-all"
                    />
                  </div>
                </div>
              </div>

              <div className="bg-primary/5 border border-primary/20 p-6 rounded-3xl space-y-4">
                <div className="flex items-center gap-3">
                  <AlertCircle className="w-5 h-5 text-primary" />
                  <h4 className="text-[10px] font-black text-primary uppercase tracking-[0.2em] italic">Segurança & Políticas</h4>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white/70">Permitir Taxas Customizadas por Criador</span>
                  <button 
                    onClick={() => setConfig({...config, allowCreatorCustomFee: !config.allowCreatorCustomFee})}
                    className={`w-12 h-6 rounded-full transition-all relative ${config.allowCreatorCustomFee ? 'bg-primary shadow-[0_0_15px_rgba(0,255,135,0.3)]' : 'bg-white/10'}`}
                  >
                    <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${config.allowCreatorCustomFee ? 'left-7' : 'left-1'}`} />
                  </button>
                </div>
              </div>

              <button 
                onClick={async () => {
                  await saveGlobalMonetizationConfig(config);
                  toast.success("Configurações salvas e auditadas.");
                }}
                className="w-full py-5 bg-primary text-primary-foreground rounded-[24px] font-black uppercase tracking-[0.3em] italic text-xs shadow-[0_10px_30px_rgba(0,255,135,0.2)] hover:shadow-[0_15px_40px_rgba(0,255,135,0.3)] hover:-translate-y-1 transition-all border-b-4 border-black/20"
              >
                Salvar Alterações
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
