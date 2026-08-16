import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { requireAdmin, useAdminFocusRevalidation } from "@/lib/admin-guard";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  ArrowLeft,
  Settings,
  Coins,
  Cpu,
  Database,
  ShieldAlert,
  ShoppingBag,
  TrendingUp,
  Users,
  Search,
  CheckCircle2,
  XCircle,
  Save,
  Zap,
  PlayCircle,
  AlertCircle,
  Activity,
  Award,
  Download,
  Calendar,
  Filter,
  Palette,
  Mail,
  PieChart,
  Tag,
  Pause,
  Play,
  Hammer
} from "lucide-react";

import { ProfileSummaryCard } from "@/components/ProfileSummaryCard";
import { Button } from "@/components/ui/button";

import { Input } from "@/components/ui/input";
import { 
  getAIAdminConfig, 
  saveAIAdminConfig, 
  testAIConnection,
  type AIAdminConfig,
  type AIProviderConfig
} from "@/lib/info-products/ai-admin.functions";
import { useServerFn } from "@tanstack/react-start";
import { 
  fetchMonetizationConfig, 
  saveMonetizationConfig, 
  type MonetizationConfig 
} from "@/lib/monetization";
import { 
  exportCertificatesCSV,
  exportAffiliateEvents,
  resolveFraudEvent,
  getPDFQueueStatus,
  getEmailAuditLogs,
  processPDFQueueItem,
  getAdminSalesList,
  getAdminCouponList,
  adminRefundSale,
  getGlobalMonetizationConfig,
  saveGlobalMonetizationConfig,
  updateCouponStatus,
  getAdminAuditLogs
} from "@/lib/info-products/v2-monetization";
import { PanelActions } from "@/components/PanelActions";

export const Route = createFileRoute("/_authenticated/admin/infoprodutos")({
  beforeLoad: requireAdmin,
  component: AdminInfoProductsPage,
});

type AdminTab = "config" | "taxa" | "ia" | "storage" | "moderacao" | "produtos" | "vendas" | "criadores" | "auditoria" | "certificados" | "assinatura" | "afiliados" | "preview" | "cupons";

function AdminInfoProductsPage() {
  const [tab, setTab] = useState<AdminTab>("config");
  const [aiConfig, setAIConfig] = useState<AIAdminConfig | null>(null);
  const [monConfig, setMonConfig] = useState<MonetizationConfig | null>(null);
  const [pdfQueue, setPdfQueue] = useState<any[]>([]);
  const [selectedCertificateId, setSelectedCertificateId] = useState<string | null>(null);
  const [emailAudit, setEmailAudit] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [testing, setTesting] = useState<string | null>(null);
  const [dirtyAI, setDirtyAI] = useState(false);
  const [dirtyMon, setDirtyMon] = useState(false);
  const [sales, setSales] = useState<any[]>([]);
  const [coupons, setCoupons] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [filters, setFilters] = useState({
    period: 'all' as any,
    status: 'ALL'
  });

  const getAIConfigFn = useServerFn(getAIAdminConfig);
  const saveAIConfigFn = useServerFn(saveAIAdminConfig);
  const testAIFn = useServerFn(testAIConnection);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      getAIConfigFn(),
      fetchMonetizationConfig()
    ]).then(([ai, mon]) => {
      setAIConfig(ai);
      setMonConfig(mon);
      setLoading(false);
    });
    // Carregar fila de PDFs e auditoria se necessário
    if (tab === 'certificados') {
      getPDFQueueStatus('SYSTEM').then(setPdfQueue);
    }
    if (tab === 'vendas') {
      getAdminSalesList(filters).then(res => setSales(res.data || []));
    }
    if (tab === 'cupons') {
      getAdminCouponList().then(setCoupons);
    }
    if (tab === 'auditoria') {
      getAdminAuditLogs().then(setAuditLogs);
    }
  }, [tab]);

  useEffect(() => {
    if (selectedCertificateId) {
      getEmailAuditLogs(selectedCertificateId).then(setEmailAudit);
    }
  }, [selectedCertificateId]);

  const handleSaveAI = async () => {
    if (!aiConfig) return;
    try {
      await saveAIConfigFn({ data: aiConfig });
      setDirtyAI(false);
      toast.success("Configurações de IA salvas com sucesso.");
    } catch (e: any) {
      toast.error("Erro ao salvar IA: " + e.message);
    }
  };

  const handleSaveMon = async () => {
    if (!monConfig) return;
    try {
      await saveMonetizationConfig(monConfig);
      setDirtyMon(false);
      toast.success("Taxas e limites salvos.");
    } catch (e: any) {
      toast.error("Erro ao salvar taxas: " + e.message);
    }
  };

  const handleTestAI = async (providerId: string) => {
    setTesting(providerId);
    try {
      const res = await testAIFn({ data: { providerId } });
      if (res.success) {
        toast.success(`Teste ${providerId} OK: ${res.duration}ms (${res.model})`);
      } else {
        toast.error(`Falha no teste ${providerId}: ${res.error}`);
      }
    } catch (e: any) {
      toast.error("Erro no teste: " + e.message);
    } finally {
      setTesting(null);
    }
  };

  if (loading || !aiConfig || !monConfig) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-emerald-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-[#0A0A0B] text-white relative isolate">
      {/* Sidebar de Perfil Fixa no Admin */}
      <ProfileSummaryCard role="lojista" variant="sidebar" />

      <header className="sticky top-0 z-[60] bg-[#0A0A0B]/95 backdrop-blur border-b border-white/10 lg:pl-72 transition-all">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Link to="/admin" className="p-2 rounded-xl hover:bg-white/10 transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <div className="flex items-center gap-2 text-primary mb-0.5">
                <Hammer className="w-4 h-4" />
                <span className="text-[10px] font-black uppercase tracking-[0.2em]">Creator Studio</span>
              </div>
              <h1 className="text-xl font-black italic uppercase tracking-tighter">Gestão de Info Produtos e Vendas</h1>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            {/* Barra de Ações Rápidas no Topo */}
            <div className="hidden md:flex items-center gap-3 mr-4 border-r border-white/10 pr-4">
              <PanelActions role="lojista" />
            </div>

            <div className="flex items-center gap-2">
              {dirtyAI && (
                <Button onClick={handleSaveAI} className="bg-amber-500 hover:bg-amber-400 text-black font-black uppercase tracking-widest text-[10px] h-9 px-4 rounded-xl">
                  Salvar IA
                </Button>
              )}
              {dirtyMon && (
                <Button onClick={handleSaveMon} className="bg-primary hover:bg-primary/90 text-primary-foreground font-black uppercase tracking-widest text-[10px] h-9 px-4 rounded-xl shadow-[0_0_15px_rgba(0,255,135,0.2)]">
                  Salvar Config
                </Button>
              )}
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 pb-2">
          {/* Card Mobile Inline */}
          <ProfileSummaryCard role="lojista" variant="auto" />
          
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-2 border-t border-white/5 mt-2">
            <TabBtn active={tab === 'produtos'} onClick={() => setTab('produtos')} icon={<ShoppingBag className="w-3.5 h-3.5" />} label="Produtos" />
            <TabBtn active={tab === 'vendas'} onClick={() => setTab('vendas')} icon={<TrendingUp className="w-3.5 h-3.5" />} label="Vendas" />
            <TabBtn active={tab === 'auditoria'} onClick={() => setTab('auditoria')} icon={<Search className="w-3.5 h-3.5" />} label="Analytics" />
            <TabBtn active={tab === 'cupons'} onClick={() => setTab('cupons')} icon={<Tag className="w-3.5 h-3.5" />} label="Cupons" />
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8 lg:pl-72 transition-all">

        {tab === 'ia' && (
          <div className="space-y-6">
            <div className="bg-white/[0.03] border border-white/10 rounded-[32px] overflow-hidden">
              <div className="p-6 border-b border-white/5 bg-white/[0.02]">
                <h3 className="text-sm font-black text-white uppercase italic flex items-center gap-2">
                  <Cpu className="w-4 h-4 text-primary" />
                  Provedores de IA & Fallback
                </h3>
              </div>
              <div className="p-6 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {aiConfig.providers.map((p, idx) => (
                  <AIProviderCard 
                    key={p.id} 
                    provider={p} 
                    idx={idx}
                    testing={testing === p.id}
                    onTest={() => handleTestAI(p.id)}
                    onChange={(patch) => {
                      const next = [...aiConfig.providers];
                      next[idx] = { ...next[idx], ...patch };
                      setAIConfig({ ...aiConfig, providers: next });
                      setDirtyAI(true);
                    }}
                  />
                ))}
              </div>
            </div>

            <div className="bg-amber-500/10 border border-amber-500/20 p-6 rounded-[32px] flex items-start gap-4">
              <Zap className="w-6 h-6 text-amber-500 shrink-0 mt-1" />
              <div>
                <h4 className="font-bold text-amber-200 uppercase tracking-widest text-xs">Mecanismo de Resiliência</h4>
                <p className="text-sm text-amber-200/60 mt-1 leading-relaxed">
                  A plataforma utiliza um fluxo de fallback em cascata: OpenAI (Primário) → Perplexity (Secundário) → Gemini (Terciário). 
                  Se um provedor falhar ou atingir o timeout, o sistema tenta automaticamente o próximo na lista de prioridade.
                </p>
              </div>
            </div>
          </div>
        )}

        {tab === 'taxa' && (
          <div className="space-y-6 max-w-2xl">
            <div className="bg-white/[0.03] border border-white/10 p-8 rounded-[32px] space-y-6">
              <div>
                <h3 className="text-sm font-black text-white uppercase italic mb-1">Taxa FIXXER (Info Produtos)</h3>
                <p className="text-xs text-muted-foreground">Comissão padrão cobrada sobre cada venda realizada.</p>
              </div>
              <div className="relative">
                <Input 
                  type="number" 
                  value={monConfig.pixPlatformFeePercent}
                  onChange={(e) => {
                    setMonConfig({ ...monConfig, pixPlatformFeePercent: parseFloat(e.target.value) });
                    setDirtyMon(true);
                  }}
                  className="bg-black/40 border-white/10 h-16 rounded-2xl text-2xl font-black italic pr-12 text-primary"
                />
                <span className="absolute right-6 top-1/2 -translate-y-1/2 text-primary font-black text-xl">%</span>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white/5 p-4 rounded-2xl border border-white/5">
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Repasse Criador</p>
                  <p className="text-xl font-black text-white italic">{100 - monConfig.pixPlatformFeePercent}%</p>
                </div>
                <div className="bg-white/5 p-4 rounded-2xl border border-white/5">
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Status</p>
                  <p className="text-xl font-black text-emerald-400 italic">ATIVO</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {tab === 'config' && (
          <div className="grid gap-6 md:grid-cols-2">
            <ConfigSection title="Publicação" icon={<PlayCircle className="text-emerald-400" />}>
              <div className="space-y-4">
                <ToggleRow label="Auto-aprovação" desc="Novos produtos são publicados sem revisão" on={true} />
                <ToggleRow label="Permitir Preview" desc="Habilita visualização parcial gratuita" on={true} />
                <ToggleRow label="Requerer Termos" desc="Criador deve aceitar termos a cada envio" on={true} />
              </div>
            </ConfigSection>

            <ConfigSection title="Downloads & Limites" icon={<Database className="text-blue-400" />}>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-white/5 rounded-xl border border-white/5">
                  <div className="space-y-0.5">
                    <p className="text-xs font-bold text-white uppercase tracking-widest">Tamanho Máximo</p>
                    <p className="text-[10px] text-muted-foreground">Limite por arquivo (MB)</p>
                  </div>
                  <Input type="number" defaultValue={500} className="w-20 h-8 bg-black/40 border-white/10 text-xs font-bold text-center" />
                </div>
                <ToggleRow label="Download Offline" desc="Permite que usuários baixem o conteúdo" on={false} />
                <ToggleRow label="Proteção de Cópia" desc="Dificulta captura de tela/texto" on={true} />
              </div>
            </ConfigSection>
          </div>
        )}

        {tab === 'vendas' && (
          <div className="space-y-8 animate-in fade-in duration-500">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-xl font-black italic uppercase tracking-tighter">Analytics de Vendas</h2>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="bg-white/5 border-white/10 text-[10px] font-bold uppercase tracking-widest rounded-xl">7 Dias</Button>
                <Button variant="outline" size="sm" className="bg-primary/20 border-primary/30 text-primary text-[10px] font-bold uppercase tracking-widest rounded-xl">30 Dias</Button>
                <Button variant="outline" size="sm" className="bg-white/5 border-white/10 text-[10px] font-bold uppercase tracking-widest rounded-xl">Tudo</Button>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <MetricBox label="Vendas Individuais" value="R$ 42.150,00" sub="842 unidades" color="text-emerald-400" />
              <MetricBox label="Assinaturas Academy" value="R$ 28.400,00" sub="156 planos ativos" color="text-amber-400" />
              <MetricBox label="Bundles (Combos)" value="R$ 14.890,50" sub="92 combos vendidos" color="text-blue-400" />
            </div>

            <div className="bg-card/50 backdrop-blur-xl border border-white/10 rounded-[32px] overflow-hidden">
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
                              <div className="w-9 h-9 rounded-full bg-primary/20 flex items-center justify-center border border-primary/30 text-[10px] font-bold">
                                {sale.profiles?.display_name?.charAt(0) || 'U'}
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
                          <td className="px-6 py-4 text-center text-[10px] font-bold text-muted-foreground uppercase">
                             {new Date(sale.created_at).toLocaleDateString('pt-BR')}
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
                                  onClick={async () => {
                                    if(confirm("Estornar?")) {
                                      await adminRefundSale(sale.id, "Admin Refund");
                                      toast.success("Estornado.");
                                      getAdminSalesList(filters).then(res => setSales(res.data || []));
                                    }
                                  }}
                                  className="p-2 bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white rounded-xl transition-all border border-red-500/20"
                                >
                                  <AlertCircle className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
            </div>
          </div>
        )}

        {(tab === 'certificados' || tab === 'assinatura') && (
          <div className="space-y-8 animate-in fade-in duration-500">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-xl font-black italic uppercase tracking-tighter">
                Configuração de {tab === 'certificados' ? 'Certificados' : 'Assinaturas'}
              </h2>
            </div>
            
            <div className="grid gap-6 md:grid-cols-2">
              <div className="bg-white/[0.03] border border-white/10 p-8 rounded-[32px] space-y-6">
                <h3 className="text-xs font-black text-white uppercase italic flex items-center gap-2">
                   <Settings className="w-4 h-4 text-primary" />
                   Regras do Catálogo & Limites
                </h3>
                <div className="space-y-4">
                   <div className="space-y-2">
                     <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Preço Base (BRL)</label>
                     <Input type="number" defaultValue={tab === 'certificados' ? 29 : 99} className="bg-black/40 border-white/10 h-12 rounded-xl" />
                   </div>
                   <div className="space-y-2">
                     <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Duração do Acesso (Dias)</label>
                     <Input type="number" defaultValue={365} className="bg-black/40 border-white/10 h-12 rounded-xl" />
                   </div>
                   <ToggleRow label="Auto-Geração" desc="Emitir certificado automaticamente no fim do curso" on={true} />
                   <ToggleRow label="Validação Pública" desc="Permitir consulta externa de autenticidade" on={true} />
                </div>
                <Button className="w-full bg-primary text-primary-foreground font-black h-12 rounded-2xl uppercase tracking-widest text-[10px]">
                   <Save className="w-4 h-4 mr-2" />
                   Salvar Configuração
                </Button>
              </div>

              <div className="bg-white/[0.03] border border-white/10 p-8 rounded-[32px] space-y-6">
                <h3 className="text-xs font-black text-white uppercase italic flex items-center gap-2">
                   <ShieldAlert className="w-4 h-4 text-amber-400" />
                   Regras de Elegibilidade
                </h3>
                <div className="space-y-4">
                  <p className="text-[10px] text-muted-foreground uppercase leading-relaxed font-bold">
                    Defina quais produtos do catálogo podem ser incluídos neste módulo administrativo. O criador deve possuir reputação mínima de 4.5.
                  </p>
                  <div className="p-4 rounded-2xl bg-white/5 border border-dashed border-white/10 flex items-center justify-center min-h-[150px]">
                    <span className="text-[10px] text-muted-foreground uppercase font-bold italic">Configuração de filtros avançada em breve</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {tab === 'preview' && (
          <div className="space-y-8 animate-in fade-in duration-500">
             <div className="flex items-center justify-between mb-2">
                <h2 className="text-xl font-black italic uppercase tracking-tighter">Preview de Certificado</h2>
                <div className="bg-amber-500/10 border border-amber-500/20 px-4 py-1.5 rounded-full">
                  <span className="text-[10px] font-black text-amber-500 uppercase tracking-widest italic">Tempo Real</span>
                </div>
             </div>
             
             <div className="grid lg:grid-cols-2 gap-8">
                {/* Editor Sidebar */}
                <div className="bg-white/[0.03] border border-white/10 p-8 rounded-[32px] space-y-6 h-fit">
                   <h3 className="text-xs font-black text-white uppercase italic flex items-center gap-2">
                      <Palette className="w-4 h-4 text-primary" />
                      Ajustes de Branding
                   </h3>
                   <div className="space-y-4">
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Logo do Criador</label>
                        <Input placeholder="URL da logo..." className="bg-black/40 border-white/10 h-11 rounded-xl" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Cor de Destaque</label>
                        <div className="flex gap-3">
                           <Input type="color" className="w-11 h-11 p-1 bg-black/40 border-white/10 rounded-xl cursor-pointer" defaultValue="#00FF87" />
                           <Input placeholder="#00FF87" className="flex-1 bg-black/40 border-white/10 h-11 rounded-xl" />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Texto de Rodapé</label>
                        <Input defaultValue="Fixxer Academy - Certificado de Conclusão" className="bg-black/40 border-white/10 h-11 rounded-xl" />
                      </div>
                   </div>
                   <Button className="w-full bg-primary text-primary-foreground font-black h-12 rounded-2xl uppercase tracking-widest text-[10px]">
                      <Save className="w-4 h-4 mr-2" />
                      Salvar Identidade
                   </Button>
                </div>

                {/* Live Preview */}
                <div className="bg-white p-12 rounded-[32px] shadow-2xl min-h-[500px] flex flex-col border border-black/5 text-black">
                   <div className="flex-1 flex flex-col items-center justify-center text-center space-y-8">
                      <div className="w-24 h-24 bg-gray-100 rounded-2xl flex items-center justify-center border-2 border-dashed border-gray-300">
                         <span className="text-[10px] font-bold text-gray-400 uppercase">Logo</span>
                      </div>
                      
                      <div className="space-y-4">
                         <h1 className="text-3xl font-black uppercase tracking-tighter italic">Certificado de Conclusão</h1>
                         <div className="w-32 h-1 bg-[#00FF87] mx-auto" />
                      </div>

                      <div className="space-y-2">
                         <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Certificamos que</p>
                         <p className="text-2xl font-black italic">Nome do Aluno Exemplo</p>
                      </div>

                      <div className="max-w-md">
                         <p className="text-sm leading-relaxed">
                            Concluiu com êxito o treinamento avançado <strong>"Expert em Fixxer Pro"</strong> com carga horária de 40 horas, 
                            demonstrando proficiência total nos módulos de arquitetura e infraestrutura.
                         </p>
                      </div>

                      <div className="pt-8 flex gap-12">
                         <div className="text-center">
                            <div className="w-32 h-px bg-gray-300 mb-2" />
                            <p className="text-[10px] font-bold uppercase tracking-widest">Fixxer Academy</p>
                         </div>
                         <div className="text-center">
                            <div className="w-32 h-px bg-gray-300 mb-2" />
                            <p className="text-[10px] font-bold uppercase tracking-widest">Jorge Salgado</p>
                         </div>
                      </div>
                   </div>

                   <div className="mt-12 flex items-center justify-between border-t pt-6 text-[8px] font-bold uppercase text-gray-400">
                      <span>CÓD: FX-PREVIEW-2026</span>
                      <span>VALIDADO EM FIXXER.APP/CERTIFICADOS</span>
                      <div className="w-8 h-8 bg-black rounded" />
                   </div>
                </div>
             </div>
          </div>
        )}
        {tab === 'afiliados' && (
          <div className="space-y-8 animate-in fade-in duration-500">

            <div className="flex items-center justify-between mb-2">
              <h2 className="text-xl font-black italic uppercase tracking-tighter">Gestão de Afiliados & Anti-Fraude</h2>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="bg-white/5 border-white/10 text-[10px] font-bold uppercase tracking-widest rounded-xl">
                  Configurações Globais
                </Button>
                <div className="bg-primary/10 border border-primary/20 px-4 py-1.5 rounded-full">
                  <span className="text-[10px] font-black text-primary uppercase tracking-widest italic">V3 Ready Architecture</span>
                </div>
              </div>
            </div>
            
            <div className="grid gap-6 md:grid-cols-4">
              <MetricBox label="Volume Atribuído" value="R$ 128.450" sub="+12% este mês" color="text-primary" />
              <MetricBox label="Cliques Totais" value="42.150" sub="CTR 3.2%" color="text-blue-400" />
              <MetricBox label="Afiliados Ativos" value="1.242" sub="Rede Global" color="text-emerald-400" />
              <MetricBox label="Bloqueios Fraude" value="12" sub="Self-referral detectado" color="text-rose-500" />
            </div>

            <div className="grid gap-6 lg:grid-cols-3">
              <div className="lg:col-span-2 bg-white/[0.03] border border-white/10 rounded-[32px] overflow-hidden">
                <div className="p-6 border-b border-white/5 bg-white/[0.02] flex items-center justify-between">
                  <h3 className="text-xs font-black text-white uppercase italic flex items-center gap-2">
                    <Activity className="w-4 h-4 text-primary" />
                    Eventos de Auditoria & Conversões
                  </h3>
                  <div className="flex gap-2">
                    <Input placeholder="Filtrar por Creator/Produto..." className="w-48 h-8 bg-black/40 border-white/10 text-[10px] uppercase font-bold" />
                  </div>
                </div>
                <div className="p-0 overflow-x-auto">
                   <table className="w-full text-left border-collapse">
                     <thead>
                       <tr className="border-b border-white/5 bg-white/[0.01]">
                         <th className="p-4 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Data</th>
                         <th className="p-4 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Afiliado</th>
                         <th className="p-4 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Evento</th>
                         <th className="p-4 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Valor</th>
                         <th className="p-4 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Status</th>
                       </tr>
                     </thead>
                     <tbody className="text-xs">
                       <tr className="border-b border-white/5 hover:bg-white/[0.02] transition-colors">
                         <td className="p-4 font-mono text-muted-foreground">13/08 14:20</td>
                         <td className="p-4 font-bold">FX-USER-092</td>
                         <td className="p-4"><span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 text-[9px] font-black uppercase">Venda Atribuída</span></td>
                         <td className="p-4 font-black italic">R$ 99,90</td>
                         <td className="p-4 text-emerald-400">EFETIVADO</td>
                       </tr>
                       <tr className="border-b border-white/5 hover:bg-white/[0.02] transition-colors">
                         <td className="p-4 font-mono text-muted-foreground">13/08 13:45</td>
                         <td className="p-4 font-bold">FX-USER-441</td>
                         <td className="p-4"><span className="px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-400 text-[9px] font-black uppercase">Bloqueio Fraude</span></td>
                         <td className="p-4 font-black italic">R$ 450,00</td>
                         <td className="p-4 text-rose-500">RECUSADO (Self)</td>
                       </tr>
                     </tbody>
                   </table>
                </div>
              </div>

              <div className="space-y-6">
                <div className="bg-white/[0.03] border border-white/10 p-6 rounded-[32px] space-y-4">
                  <h4 className="text-[10px] font-black text-white uppercase italic tracking-widest">Regras Anti-Fraude</h4>
                  <div className="space-y-3">
                    <ToggleRow label="Bloquear Self-Referral" desc="Impede afiliado de comprar via próprio link" on={true} />
                    <ToggleRow label="Cookie Fingerprint" desc="Validação por IP e User-Agent" on={true} />
                    <ToggleRow label="Atribuição Last-Click" desc="Prioriza o último link clicado pelo usuário" on={true} />
                  </div>
                </div>
                
                <div className="bg-primary/5 border border-primary/10 p-6 rounded-[32px]">
                   <h4 className="text-[10px] font-black text-primary uppercase italic tracking-widest flex items-center gap-2">
                     <PieChart className="w-3.5 h-3.5" />
                     Distribuição de Splits
                   </h4>
                   <div className="mt-4 space-y-3">
                      <div className="flex justify-between text-[10px] font-bold uppercase">
                        <span className="text-muted-foreground">Criador</span>
                        <span>75%</span>
                      </div>
                      <div className="w-full bg-white/5 h-1.5 rounded-full overflow-hidden">
                        <div className="bg-primary h-full w-[75%]" />
                      </div>
                      <div className="flex justify-between text-[10px] font-bold uppercase">
                        <span className="text-muted-foreground">Afiliado (Méd.)</span>
                        <span>15%</span>
                      </div>
                      <div className="w-full bg-white/5 h-1.5 rounded-full overflow-hidden">
                        <div className="bg-blue-400 h-full w-[15%]" />
                      </div>
                      <div className="flex justify-between text-[10px] font-bold uppercase">
                        <span className="text-muted-foreground">FIXXER (Plat.)</span>
                        <span>10%</span>
                      </div>
                      <div className="w-full bg-white/5 h-1.5 rounded-full overflow-hidden">
                        <div className="bg-emerald-400 h-full w-[10%]" />
                      </div>
                   </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {tab === 'auditoria' && (
          <div className="space-y-8 animate-in fade-in duration-500">
             <div className="flex items-center justify-between mb-2">
                <h2 className="text-xl font-black italic uppercase tracking-tighter">Fila de Revisão & Conciliação</h2>
                <div className="flex gap-2">
                   <Button 
                     variant="outline" 
                     size="sm" 
                     onClick={() => exportAffiliateEvents({})}
                     className="bg-white/5 border-white/10 text-[10px] font-bold uppercase tracking-widest rounded-xl"
                   >
                      <Download className="w-3 h-3 mr-2" />
                      Exportar Auditoria (CSV)
                   </Button>
                   <div className="bg-amber-500/10 border border-amber-500/20 px-4 py-1.5 rounded-full">
                      <span className="text-[10px] font-black text-amber-500 uppercase tracking-widest italic">Antifraude Ativo</span>
                   </div>
                </div>
             </div>

             <div className="grid gap-6">
                <div className="bg-white/[0.03] border border-white/10 rounded-[32px] overflow-hidden">
                   <div className="p-6 border-b border-white/5 bg-white/[0.02] flex items-center justify-between">
                      <h3 className="text-xs font-black text-white uppercase italic flex items-center gap-2">
                        <ShieldAlert className="w-4 h-4 text-primary" />
                        Eventos Suspeitos Aguardando Revisão
                      </h3>
                   </div>
                   <div className="p-0 overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                         <thead>
                            <tr className="border-b border-white/5 bg-white/[0.01]">
                               <th className="p-4 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Origem</th>
                               <th className="p-4 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Motivo</th>
                               <th className="p-4 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Severidade</th>
                               <th className="p-4 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Ações</th>
                            </tr>
                         </thead>
                         <tbody className="text-xs">
                            <tr className="border-b border-white/5 hover:bg-white/[0.02] transition-colors">
                               <td className="p-4 font-bold">SALE-X442</td>
                               <td className="p-4 text-muted-foreground">Self-referral detectado (mesmo IP)</td>
                               <td className="p-4"><span className="px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-400 text-[9px] font-black uppercase">Crítico</span></td>
                               <td className="p-4 flex gap-2">
                                  <Button size="sm" onClick={() => resolveFraudEvent('1', 'approve')} className="h-7 px-3 bg-emerald-500 text-white text-[9px] font-black uppercase rounded-lg">Aprovar</Button>
                                  <Button size="sm" onClick={() => resolveFraudEvent('1', 'revoke')} className="h-7 px-3 bg-rose-500 text-white text-[9px] font-black uppercase rounded-lg">Revogar</Button>
                               </td>
                            </tr>
                         </tbody>
                      </table>
                   </div>
                </div>

                <div className="bg-white/[0.03] border border-white/10 rounded-[32px] overflow-hidden">
                   <div className="p-6 border-b border-white/5 bg-white/[0.02] flex items-center justify-between">
                      <h3 className="text-xs font-black text-white uppercase italic flex items-center gap-2">
                        <Activity className="w-4 h-4 text-amber-500" />
                        Histórico de Auditoria Master
                      </h3>
                      <Button size="sm" variant="ghost" className="text-[9px] font-black uppercase text-primary" onClick={() => getAdminAuditLogs().then(setAuditLogs)}>Atualizar</Button>
                   </div>
                   <div className="p-0 overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                         <thead>
                            <tr className="border-b border-white/5 bg-white/[0.01]">
                               <th className="p-4 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Data</th>
                               <th className="p-4 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Admin</th>
                               <th className="p-4 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Ação</th>
                               <th className="p-4 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Detalhes</th>
                            </tr>
                         </thead>
                         <tbody className="text-[10px]">
                            {auditLogs.map((log) => (
                              <tr key={log.id} className="border-b border-white/5 hover:bg-white/[0.02] transition-colors">
                                <td className="p-4 text-muted-foreground font-mono">{new Date(log.created_at).toLocaleString('pt-BR')}</td>
                                <td className="p-4 font-bold text-emerald-400">{log.admin?.display_name || 'Admin Master'}</td>
                                <td className="p-4 font-black uppercase italic">{log.action}</td>
                                <td className="p-4 text-muted-foreground font-mono max-w-xs truncate" title={log.details}>
                                  {log.details || '-'}
                                </td>
                              </tr>
                            ))}
                            {auditLogs.length === 0 && (
                              <tr>
                                <td colSpan={4} className="p-8 text-center text-muted-foreground font-bold uppercase tracking-widest">Nenhum log encontrado</td>
                              </tr>
                            )}
                         </tbody>
                      </table>
                   </div>
                </div>
             </div>
          </div>
        )}
        {tab === 'certificados' && (
          <div className="space-y-8 animate-in fade-in duration-500">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-xl font-black italic uppercase tracking-tighter">Gestão de PDFs & Auditoria</h2>
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="bg-primary/20 border-primary/30 text-primary text-[10px] font-bold uppercase tracking-widest rounded-xl"
                  onClick={() => getPDFQueueStatus('SYSTEM').then(setPdfQueue)}
                >
                  <Activity className="w-3 h-3 mr-2" />
                  Atualizar Fila
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={async () => {
                    try {
                      const csv = await exportCertificatesCSV({});
                      const blob = new Blob([csv], { type: 'text/csv' });
                      const url = window.URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = `auditoria_certificados_${new Date().toISOString().split('T')[0]}.csv`;
                      a.click();
                      toast.success("CSV exportado com sucesso.");
                    } catch (e) {
                      toast.error("Erro ao exportar CSV");
                    }
                  }}
                  className="bg-emerald-500/10 border-emerald-500/20 text-emerald-400 text-[10px] font-bold uppercase tracking-widest rounded-xl"
                >
                  <Download className="w-3.5 h-3.5 mr-2" />
                  Exportar Auditoria (CSV)
                </Button>
              </div>
            </div>

            <div className="grid lg:grid-cols-2 gap-8">
              {/* Fila de PDFs */}
              <div className="bg-white/[0.03] border border-white/10 rounded-[32px] overflow-hidden">
                <div className="p-6 border-b border-white/5 bg-white/[0.02]">
                  <h3 className="text-[10px] font-black text-white uppercase italic tracking-widest flex items-center gap-2">
                    <Cpu className="w-4 h-4 text-primary" />
                    Fila de Geração em Lote
                  </h3>
                </div>
                <div className="p-0 overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-white/5 text-[9px] font-black uppercase tracking-widest text-muted-foreground">
                        <th className="p-4">Aluno / Curso</th>
                        <th className="p-4 text-center">Tentativas</th>
                        <th className="p-4">Status</th>
                        <th className="p-4 text-right">Ação</th>
                      </tr>
                    </thead>
                    <tbody className="text-[10px] font-medium">
                      {pdfQueue.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="p-8 text-center text-muted-foreground italic font-bold">Nenhum item na fila</td>
                        </tr>
                      ) : (
                        pdfQueue.map(item => (
                          <tr key={item.id} className="hover:bg-white/5 border-b border-white/5 transition-colors">
                            <td className="p-4">
                              <p className="font-bold text-white uppercase italic">{item.info_certificates?.student_name || "Desconhecido"}</p>
                              <p className="text-[8px] text-muted-foreground uppercase">{item.info_certificates?.course_name || "N/A"}</p>
                            </td>
                            <td className="p-4 text-center font-mono">{item.attempts} / {item.max_attempts}</td>
                            <td className="p-4">
                              <span className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase border ${
                                item.status === 'completed' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                                item.status === 'failed' ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' :
                                'bg-amber-500/10 text-amber-400 border-amber-500/20'
                              }`}>
                                {item.status}
                              </span>
                            </td>
                            <td className="p-4 text-right">
                              {item.status === 'failed' && (
                                <Button size="sm" onClick={() => processPDFQueueItem(item.id)} className="h-6 px-2 bg-amber-500 text-black text-[8px] font-black uppercase rounded-lg">Retry</Button>
                              )}
                              {item.status === 'completed' && (
                                <Button variant="ghost" size="sm" asChild className="h-6 w-6 p-0 text-emerald-400">
                                  <a href={item.pdf_url} target="_blank" rel="noreferrer"><Download className="w-3 h-3" /></a>
                                </Button>
                              )}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Auditoria de E-mail */}
              <div className="bg-white/[0.03] border border-white/10 rounded-[32px] overflow-hidden">
                <div className="p-6 border-b border-white/5 bg-white/[0.02] flex items-center justify-between">
                  <h3 className="text-[10px] font-black text-white uppercase italic tracking-widest flex items-center gap-2">
                    <Mail className="w-4 h-4 text-blue-400" />
                    Log de Auditoria de E-mail
                  </h3>
                  <div className="flex gap-2">
                    <Search className="w-3 h-3 text-muted-foreground" />
                    <Input 
                      placeholder="ID do Certificado..." 
                      className="h-7 w-32 bg-black/40 border-white/10 text-[9px] uppercase font-bold"
                      onChange={(e) => setSelectedCertificateId(e.target.value)}
                    />
                  </div>
                </div>
                <div className="p-0 overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-white/5 text-[9px] font-black uppercase tracking-widest text-muted-foreground">
                        <th className="p-4">Destinatário</th>
                        <th className="p-4">Tipo</th>
                        <th className="p-4">Status</th>
                        <th className="p-4 text-right">Data</th>
                      </tr>
                    </thead>
                    <tbody className="text-[10px] font-medium">
                      {emailAudit.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="p-8 text-center text-muted-foreground italic font-bold">Pesquise um ID para ver auditoria</td>
                        </tr>
                      ) : (
                        emailAudit.map(log => (
                          <tr key={log.id} className="hover:bg-white/5 border-b border-white/5 transition-colors">
                            <td className="p-4 font-bold text-white lowercase">{log.recipient_email}</td>
                            <td className="p-4 uppercase text-[8px]">{log.notification_type}</td>
                            <td className="p-4">
                              <span className="text-emerald-400 uppercase font-black italic">{log.status}</span>
                            </td>
                            <td className="p-4 text-right text-muted-foreground font-mono">
                              {new Date(log.created_at).toLocaleString()}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}

        {tab === 'vendas' && (
          <div className="space-y-8 mt-8 border-t border-white/5 pt-8">
            <h3 className="text-sm font-black text-white uppercase italic flex items-center gap-2">
              <PieChart className="w-4 h-4 text-primary" />
              Métricas Globais de Vendas
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <MetricBox 
                label="Total Bruto" 
                value={`R$ ${sales.reduce((acc, s) => acc + Number(s.amount_gross), 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`} 
                sub="Volume Total" 
                color="text-emerald-400" 
              />
              <MetricBox 
                label="Estornos" 
                value={sales.filter(s => s.status === 'REFUNDED').length.toString()} 
                sub="Qtd. Refund" 
                color="text-red-400" 
              />
              <MetricBox 
                label="Cupons Usados" 
                value={sales.filter(s => s.coupon_code).length.toString()} 
                sub="Adesão a descontos" 
                color="text-amber-400" 
              />
              <MetricBox 
                label="Ticket Médio" 
                value={`R$ ${(sales.length ? sales.reduce((acc, s) => acc + Number(s.amount_gross), 0) / sales.length : 0).toFixed(2)}`} 
                sub="Por venda" 
                color="text-blue-400" 
              />
            </div>
          </div>
        )}


        {tab === 'vendas' && (
          <div className="space-y-8 mt-8 border-t border-white/5 pt-8">
             <div className="flex items-center justify-between mb-4">
               <h3 className="text-sm font-black text-white uppercase italic flex items-center gap-2">
                 <ShieldAlert className="w-4 h-4 text-rose-500" />
                 Alertas de Segurança & Anomalias
               </h3>
               <Button variant="outline" size="sm" className="bg-rose-500/10 border-rose-500/20 text-rose-400 text-[10px] font-bold uppercase tracking-widest rounded-xl">
                 Limpar Alertas
               </Button>
             </div>
             <div className="grid gap-4">
                <div className="bg-rose-500/5 border border-rose-500/20 p-4 rounded-2xl flex items-center gap-4 animate-pulse">
                   <div className="w-10 h-10 rounded-full bg-rose-500/20 flex items-center justify-center">
                      <ShieldAlert className="w-5 h-5 text-rose-500" />
                   </div>
                   <div className="flex-1">
                      <p className="text-xs font-black text-white uppercase italic">Pico de Falhas na Validação</p>
                      <p className="text-[10px] text-rose-400/80 uppercase font-bold">52 tentativas falhas detectadas nos últimos 5 minutos via IP 187.xx.xx.xx</p>
                   </div>
                   <span className="text-[9px] font-black text-rose-500 bg-rose-500/10 px-2 py-0.5 rounded-full uppercase tracking-widest">Crítico</span>
                </div>
             </div>
          </div>
        )}


        {tab === 'cupons' && (
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
                              <button 
                                onClick={async () => {
                                  const next = coupon.status === 'ACTIVE' ? 'PAUSED' : 'ACTIVE';
                                  await updateCouponStatus(coupon.id, next);
                                  getAdminCouponList().then(setCoupons);
                                }}
                                className="p-2 bg-white/5 hover:bg-primary text-muted-foreground hover:text-white rounded-xl transition-all border border-white/10"
                              >
                                {coupon.status === 'ACTIVE' ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
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

        {['storage', 'moderacao', 'produtos', 'criadores'].includes(tab) && (
          <div className="py-32 text-center space-y-4 bg-white/[0.02] border border-dashed border-white/10 rounded-[40px]">
            <Activity className="w-12 h-12 text-muted-foreground/20 mx-auto" />
            <p className="text-muted-foreground font-black uppercase tracking-widest text-xs italic">
              Aba {tab.toUpperCase()} em desenvolvimento no próximo sprint.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}

function MetricBox({ label, value, sub, color }: { label: string; value: string; sub: string; color: string }) {
  return (
    <div className="bg-white/[0.03] border border-white/10 p-6 rounded-[32px] space-y-2">
      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{label}</p>
      <p className={`text-2xl font-black italic tracking-tighter ${color}`}>{value}</p>
      <p className="text-[10px] text-muted-foreground/60 font-medium uppercase tracking-widest">{sub}</p>
    </div>
  );
}

function AIProviderCard({ provider, idx, onTest, testing, onChange }: { 
  provider: AIProviderConfig; 
  idx: number; 
  onTest: () => void; 
  testing: boolean;
  onChange: (patch: Partial<AIProviderConfig>) => void;
}) {
  return (
    <div className="bg-black/40 border border-white/10 p-5 rounded-[24px] space-y-4 relative group">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary font-black">
            {idx + 1}
          </div>
          <div>
            <h4 className="text-xs font-black text-white uppercase tracking-widest">{provider.name}</h4>
            <p className="text-[10px] text-muted-foreground">{provider.enabled ? 'ATIVO' : 'DESATIVADO'}</p>
          </div>
        </div>
        <button 
          onClick={() => onChange({ enabled: !provider.enabled })}
          className={`w-10 h-5 rounded-full relative transition ${provider.enabled ? "bg-emerald-500" : "bg-white/10"}`}
        >
          <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-transform ${provider.enabled ? "translate-x-5" : ""}`} />
        </button>
      </div>

      <div className="space-y-3 pt-2">
        <div className="space-y-1">
          <label className="text-[9px] font-black text-muted-foreground uppercase tracking-[0.2em] ml-1">API KEY</label>
          <Input 
            type="password" 
            value={provider.apiKey}
            onChange={(e) => onChange({ apiKey: e.target.value })}
            placeholder="sk-****" 
            className="bg-black/60 border-white/10 h-10 rounded-xl text-[10px] font-mono"
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="text-[9px] font-black text-muted-foreground uppercase tracking-[0.2em] ml-1">MODELO</label>
            <Input 
              value={provider.model}
              onChange={(e) => onChange({ model: e.target.value })}
              className="bg-black/60 border-white/10 h-9 rounded-xl text-[10px] font-bold"
            />
          </div>
          <div className="space-y-1">
            <label className="text-[9px] font-black text-muted-foreground uppercase tracking-[0.2em] ml-1">PRIORIDADE</label>
            <Input 
              type="number"
              value={provider.priority}
              onChange={(e) => onChange({ priority: parseInt(e.target.value) })}
              className="bg-black/60 border-white/10 h-9 rounded-xl text-[10px] font-bold"
            />
          </div>
        </div>
      </div>

      <div className="pt-2">
        <Button 
          onClick={onTest}
          disabled={testing || !provider.apiKey}
          variant="outline"
          className="w-full h-9 border-white/10 hover:bg-white/5 rounded-xl text-[10px] font-black uppercase tracking-widest gap-2"
        >
          {testing ? (
            <div className="w-3 h-3 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          ) : (
            <PlayCircle className="w-3 h-3 text-primary" />
          )}
          Testar Conexão
        </Button>
      </div>
    </div>
  );
}

function TabBtn({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-4 py-2 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all shrink-0 border ${
        active 
          ? 'bg-primary text-primary-foreground border-primary shadow-[0_0_15px_rgba(0,255,135,0.2)]' 
          : 'bg-white/5 text-muted-foreground border-white/5 hover:text-white hover:bg-white/10'
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

function ConfigSection({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="bg-white/[0.03] border border-white/10 rounded-[32px] overflow-hidden">
      <div className="p-6 border-b border-white/5 bg-white/[0.02] flex items-center gap-3">
        {icon}
        <h3 className="text-sm font-black text-white uppercase italic">{title}</h3>
      </div>
      <div className="p-6">
        {children}
      </div>
    </div>
  );
}

function ToggleRow({ label, desc, on }: { label: string; desc: string; on: boolean }) {
  return (
    <div className="flex items-center justify-between p-3 bg-white/5 rounded-xl border border-white/5">
      <div className="space-y-0.5">
        <p className="text-xs font-bold text-white uppercase tracking-widest">{label}</p>
        <p className="text-[10px] text-muted-foreground">{desc}</p>
      </div>
      <button className={`w-9 h-4.5 rounded-full relative transition ${on ? "bg-emerald-500" : "bg-white/10"}`}>
        <span className={`absolute top-0.5 left-0.5 w-3.5 h-3.5 bg-white rounded-full transition-transform ${on ? "translate-x-4.5" : ""}`} />
      </button>
    </div>
  );
}
