import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { requireAdmin, useAdminFocusRevalidation } from "@/lib/admin-guard";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  ArrowLeft, Save, Coins, Package, Zap, Settings2, CheckCircle2, CloudOff, Cloud, RotateCcw,
  History, Download, User,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DEFAULT_MONETIZATION,
  fetchMonetizationConfig,
  saveMonetizationConfig,
  subscribeMonetization,
  fetchMonetizationHistory,
  restoreMonetizationSnapshot,
  exportMonetizationJSON,
  parseMonetizationJSON,
  type MonetizationConfig,
  type MonetizationAuditEntry,
  type PlanConfig,
  type ActionCost,
  type CoinPack,
} from "@/lib/monetization";

export const Route = createFileRoute("/_authenticated/admin/monetizacao")({
  beforeLoad: requireAdmin,
  component: AdminMonetizacaoPage,
});

type TabId = "taxa" | "planos" | "acoes" | "pacotes" | "historico" | "backup";

function AdminMonetizacaoPage() {
  const navigate = useNavigate();
  const [cfg, setCfg] = useState<MonetizationConfig | null>(null);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [remoteOk, setRemoteOk] = useState<boolean | null>(null);
  const [tab, setTab] = useState<TabId>("taxa");

  useAdminFocusRevalidation();
  void navigate;

  useEffect(() => {
    fetchMonetizationConfig().then((c) => setCfg(c));
    const unsub = subscribeMonetization((c) => {
      setCfg((cur) => (cur && dirty ? cur : c));
    });
    return () => unsub();
  }, [dirty]);

  const update = (patch: Partial<MonetizationConfig>) => {
    setCfg((prev) => (prev ? { ...prev, ...patch } : prev));
    setDirty(true);
  };

  const handleSave = async () => {
    if (!cfg) return;
    setSaving(true);
    const res = await saveMonetizationConfig(cfg);
    setSaving(false);
    setRemoteOk(res.remote);
    setDirty(false);
    if (res.remote) {
      toast.success("Configuração salva no Supabase ✓");
    } else {
      toast.warning("Salvo localmente. Supabase indisponível.");
    }
  };

  const handleReset = () => {
    if (!confirm("Restaurar todos os valores padrão de monetização?")) return;
    setCfg({ ...DEFAULT_MONETIZATION });
    setDirty(true);
  };

  const applyImported = (imported: MonetizationConfig) => {
    setCfg(imported);
    setDirty(true);
    toast.success("JSON importado — revise e clique em Salvar para aplicar.");
  };

  if (!cfg) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-emerald-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-[#0A0A0B] text-white pb-32">
      <header className="sticky top-0 z-30 bg-[#0A0A0B]/95 backdrop-blur border-b border-white/10">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center gap-3">
          <Link to="/admin" className="p-2 rounded-lg hover:bg-white/10">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="flex-1 min-w-0">
            <h1 className="text-base md:text-lg font-bold flex items-center gap-2">
              <Settings2 className="w-5 h-5 text-emerald-400" />
              Central de Monetização
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={handleReset}>
              Padrão
            </Button>
            <Button
              size="sm"
              onClick={handleSave}
              disabled={!dirty || saving}
              className="bg-emerald-500 hover:bg-emerald-400 text-black font-semibold"
            >
              {saving ? "Salvando..." : "Salvar"}
            </Button>
          </div>
        </div>

        <div className="max-w-5xl mx-auto px-4 pb-3 flex gap-2 overflow-x-auto scrollbar-none">
          {[
            { id: "taxa" as TabId, label: "Taxa PIX", icon: Coins },
            { id: "planos" as TabId, label: "Planos", icon: Zap },
            { id: "acoes" as TabId, label: "Custos", icon: Coins },
            { id: "pacotes" as TabId, label: "Pacotes", icon: Package },
            { id: "historico" as TabId, label: "Histórico", icon: History },
            { id: "backup" as TabId, label: "Backup", icon: Download },
          ].map((t) => {
            const active = tab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5 border transition ${
                  active ? "bg-emerald-500 text-black border-emerald-500" : "bg-[#1A1A1B] border-white/10 text-gray-300"
                }`}
              >
                <t.icon className="w-3.5 h-3.5" />
                {t.label}
              </button>
            );
          })}
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-6 space-y-4">
        {tab === "taxa" && (
          <div className="p-6 rounded-3xl bg-white/[0.03] border border-white/5 space-y-6">
            <h3 className="text-sm font-black text-white uppercase italic">Taxa de Intermediação PIX</h3>
            <div className="relative">
              <Input
                type="number"
                value={cfg.pixPlatformFeePercent}
                onChange={(e) => update({ pixPlatformFeePercent: parseFloat(e.target.value || "0") })}
                className="bg-black/40 border-white/10 rounded-2xl h-12 pl-4 pr-12 text-white font-black italic"
                min="0" max="100" step="0.5"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-white/40 font-black">%</span>
            </div>
          </div>
        )}
        {tab === "planos" && <PlansEditor plans={cfg.plans} onChange={(plans: PlanConfig[]) => update({ plans })} />}
        {tab === "acoes" && <ActionsEditor actions={cfg.actions} onChange={(actions: ActionCost[]) => update({ actions })} />}
        {tab === "pacotes" && <PacksEditor packs={cfg.coinPacks} onChange={(coinPacks: CoinPack[]) => update({ coinPacks })} />}
        {tab === "historico" && <HistoryTab />}
        {tab === "backup" && <BackupTab cfg={cfg} onImport={applyImported} />}
      </main>
    </div>
  );
}

function NumberField({ value, onChange, step = 1, min = 0, prefix, suffix }: any) {
  return (
    <div className="flex items-center bg-black/40 border border-white/10 rounded-lg overflow-hidden">
      {prefix && <span className="px-2 text-[11px] text-gray-400">{prefix}</span>}
      <Input
        type="number"
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value || "0"))}
        className="h-9 border-0 bg-transparent px-2 text-sm focus-visible:ring-0"
        step={step} min={min}
      />
      {suffix && <span className="px-2 text-[11px] text-gray-400">{suffix}</span>}
    </div>
  );
}

function Toggle({ on, onChange }: any) {
  return (
    <button onClick={() => onChange(!on)} className={`w-10 h-5 rounded-full relative transition ${on ? "bg-emerald-500" : "bg-white/15"}`}>
      <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-transform ${on ? "translate-x-5" : ""}`} />
    </button>
  );
}

function PlansEditor({ plans, onChange }: any) {
  const upd = (id: string, patch: any) => onChange(plans.map((p: any) => (p.id === id ? { ...p, ...patch } : p)));
  return (
    <div className="grid gap-3 md:grid-cols-2">
      {plans.map((p: any) => (
        <div key={p.id} className="bg-[#1A1A1B] border border-white/10 rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-bold">{p.name}</span>
            <Toggle on={p.enabled} onChange={(v: any) => upd(p.id, { enabled: v })} />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <NumberField prefix="R$" value={p.priceMonthlyBRL} onChange={(v: any) => upd(p.id, { priceMonthlyBRL: v })} />
            <NumberField suffix="🪙" value={p.coinsMonthly} onChange={(v: any) => upd(p.id, { coinsMonthly: v })} />
          </div>
        </div>
      ))}
    </div>
  );
}

function ActionsEditor({ actions, onChange }: any) {
  const upd = (key: string, patch: any) => onChange(actions.map((a: any) => (a.key === key ? { ...a, ...patch } : a)));
  return (
    <div className="bg-[#1A1A1B] border border-white/10 rounded-xl divide-y divide-white/5">
      {actions.map((a: any) => (
        <div key={a.key} className="p-3 flex items-center gap-3">
          <span className="flex-1 text-sm">{a.label}</span>
          <div className="w-28"><NumberField suffix="🪙" value={a.coins} onChange={(v: any) => upd(a.key, { coins: v })} /></div>
          <Toggle on={a.enabled} onChange={(v: any) => upd(a.key, { enabled: v })} />
        </div>
      ))}
    </div>
  );
}

function PacksEditor({ packs, onChange }: any) {
  const upd = (id: string, patch: any) => onChange(packs.map((p: any) => (p.id === id ? { ...p, ...patch } : p)));
  return (
    <div className="grid gap-3 md:grid-cols-2">
      {packs.map((p: any) => (
        <div key={p.id} className="bg-[#1A1A1B] border border-white/10 rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-bold">{p.name}</span>
            <Toggle on={p.enabled} onChange={(v: any) => upd(p.id, { enabled: v })} />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <NumberField prefix="R$" value={p.priceBRL} onChange={(v: any) => upd(p.id, { priceBRL: v })} />
            <NumberField suffix="🪙" value={p.coins} onChange={(v: any) => upd(p.id, { coins: v })} />
          </div>
        </div>
      ))}
    </div>
  );
}

function HistoryTab() {
  const [entries, setEntries] = useState<any[] | null>(null);
  useEffect(() => { fetchMonetizationHistory(20).then(setEntries); }, []);
  if (!entries) return <div className="text-center py-10">Carregando...</div>;
  return (
    <div className="space-y-2">
      {entries.map((e: any) => (
        <div key={e.id} className="bg-[#1A1A1B] border border-white/10 p-3 rounded-xl flex items-center justify-between">
          <div>
            <div className="text-sm font-medium">{e.summary}</div>
            <div className="text-[10px] text-gray-500">{new Date(e.created_at).toLocaleString()}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

function BackupTab({ cfg, onImport }: any) {
  return (
    <div className="grid gap-4">
      <Button onClick={() => exportMonetizationJSON(cfg)} className="bg-white/10 text-white">Exportar JSON</Button>
      <div className="p-4 border border-dashed border-white/20 rounded-xl text-center">
        <input type="file" accept=".json" onChange={async (e) => {
          const file = e.target.files?.[0];
          if (file) {
            const txt = await file.text();
            const parsed = parseMonetizationJSON(txt);
            if (parsed) onImport(parsed);
          }
        }} className="hidden" id="import-json" />
        <label htmlFor="import-json" className="cursor-pointer text-xs text-gray-400">Importar Snapshot JSON</label>
      </div>
    </div>
  );
}

