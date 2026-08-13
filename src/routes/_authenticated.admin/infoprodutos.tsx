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
  Award
} from "lucide-react";
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
import { fetchMonetizationConfig, saveMonetizationConfig, type MonetizationConfig } from "@/lib/monetization";

export const Route = createFileRoute("/_authenticated/admin/infoprodutos")({
  beforeLoad: requireAdmin,
  component: AdminInfoProductsPage,
});

type AdminTab = "config" | "taxa" | "ia" | "storage" | "moderacao" | "produtos" | "vendas" | "criadores" | "auditoria" | "certificados" | "assinatura";

function AdminInfoProductsPage() {
  const [tab, setTab] = useState<AdminTab>("config");
  const [aiConfig, setAIConfig] = useState<AIAdminConfig | null>(null);
  const [monConfig, setMonConfig] = useState<MonetizationConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [testing, setTesting] = useState<string | null>(null);
  const [dirtyAI, setDirtyAI] = useState(false);
  const [dirtyMon, setDirtyMon] = useState(false);

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
  }, []);

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
    <div className="min-h-dvh bg-[#0A0A0B] text-white pb-32">
      <header className="sticky top-0 z-30 bg-[#0A0A0B]/95 backdrop-blur border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center gap-4">
          <Link to="/admin" className="p-2 rounded-xl hover:bg-white/10 transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="flex-1">
            <div className="flex items-center gap-2 text-primary mb-0.5">
              <ShoppingBag className="w-4 h-4" />
              <span className="text-[10px] font-black uppercase tracking-[0.2em]">Módulo Info Produtos</span>
            </div>
            <h1 className="text-xl font-black italic uppercase tracking-tighter">Gestão Administrativa</h1>
          </div>
          <div className="flex gap-2">
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

        <div className="max-w-7xl mx-auto px-4 pb-4 flex gap-2 overflow-x-auto no-scrollbar">
          <TabBtn active={tab === 'config'} onClick={() => setTab('config')} icon={<Settings className="w-3.5 h-3.5" />} label="Config" />
          <TabBtn active={tab === 'taxa'} onClick={() => setTab('taxa')} icon={<Coins className="w-3.5 h-3.5" />} label="Taxas" />
          <TabBtn active={tab === 'ia'} onClick={() => setTab('ia')} icon={<Cpu className="w-3.5 h-3.5" />} label="IA" />
          <TabBtn active={tab === 'storage'} onClick={() => setTab('storage')} icon={<Database className="w-3.5 h-3.5" />} label="Storage" />
          <TabBtn active={tab === 'moderacao'} onClick={() => setTab('moderacao')} icon={<ShieldAlert className="w-3.5 h-3.5" />} label="Moderação" />
          <TabBtn active={tab === 'produtos'} onClick={() => setTab('produtos')} icon={<ShoppingBag className="w-3.5 h-3.5" />} label="Produtos" />
          <TabBtn active={tab === 'vendas'} onClick={() => setTab('vendas')} icon={<TrendingUp className="w-3.5 h-3.5" />} label="Vendas" />
          <TabBtn active={tab === 'criadores'} onClick={() => setTab('criadores')} icon={<Users className="w-3.5 h-3.5" />} label="Criadores" />
          <TabBtn active={tab === 'auditoria'} onClick={() => setTab('auditoria')} icon={<Search className="w-3.5 h-3.5" />} label="Auditoria" />
          <TabBtn active={tab === 'certificados'} onClick={() => setTab('certificados')} icon={<Award className="w-3.5 h-3.5" />} label="Certificados" />
          <TabBtn active={tab === 'assinatura'} onClick={() => setTab('assinatura')} icon={<Zap className="w-3.5 h-3.5" />} label="Assinatura" />
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
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

        {['storage', 'moderacao', 'produtos', 'vendas', 'criadores', 'auditoria'].includes(tab) && (
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
