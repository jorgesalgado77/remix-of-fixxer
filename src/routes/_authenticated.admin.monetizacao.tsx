import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import {
  ArrowLeft, Save, Coins, Package, Zap, Settings2, CheckCircle2, CloudOff, Cloud, RotateCcw,
  History, Download, Upload, Undo2, User,
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
  component: AdminMonetizacaoPage,
});

type TabId = "planos" | "acoes" | "pacotes" | "historico" | "backup";

function AdminMonetizacaoPage() {
  const navigate = useNavigate();
  const [cfg, setCfg] = useState<MonetizationConfig | null>(null);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [remoteOk, setRemoteOk] = useState<boolean | null>(null);
  const [tab, setTab] = useState<TabId>("planos");

  useEffect(() => {
    (async () => {
      const { isCurrentUserAdmin } = await import("@/lib/current-user");
      const ok = await isCurrentUserAdmin(true);
      if (!ok) {
        toast.error("Acesso restrito ao Admin Master");
        navigate({ to: "/dashboard" as any });
        return;
      }
      fetchMonetizationConfig().then((c) => setCfg(c));
    })();
    // atualização em tempo real caso outro admin salve
    const unsub = subscribeMonetization((c) => {
      setCfg((cur) => (cur && dirty ? cur : c));
    });
    return () => unsub();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigate]);


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
      toast.success("Configuração salva no Supabase ✓", {
        description: res.auditId ? "Alteração registrada no histórico." : undefined,
      });
    } else {
      toast.warning("Salvo localmente. Supabase indisponível — verifique system_settings.", {
        description: res.error?.slice(0, 140),
      });
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

  const summary = useMemo(() => {
    if (!cfg) return null;
    return {
      plansOn: cfg.plans.filter((p) => p.enabled).length,
      actionsOn: cfg.actions.filter((a) => a.enabled).length,
      packsOn: cfg.coinPacks.filter((p) => p.enabled).length,
    };
  }, [cfg]);

  if (!cfg) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-emerald-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div
      className="min-h-dvh bg-[#0A0A0B] text-white pb-32"
      style={{ paddingTop: "env(safe-area-inset-top)" }}
    >
      <header className="sticky top-0 z-30 bg-[#0A0A0B]/95 backdrop-blur border-b border-white/10">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center gap-3">
          <Link to={"/admin" as any} className="p-2 rounded-lg hover:bg-white/10">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="flex-1 min-w-0">
            <h1 className="text-base md:text-lg font-bold flex items-center gap-2">
              <Settings2 className="w-5 h-5 text-emerald-400" />
              Central de Monetização
            </h1>
            <p className="text-[11px] text-gray-400 truncate">
              Planos, custos e pacotes — <code className="text-emerald-400">system_settings</code> + auditoria
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={handleReset} className="hidden md:inline-flex">
              <RotateCcw className="w-4 h-4 mr-1" /> Padrão
            </Button>
            <Button
              size="sm"
              onClick={handleSave}
              disabled={!dirty || saving}
              className="bg-emerald-500 hover:bg-emerald-400 text-black font-semibold"
            >
              {saving ? "Salvando..." : dirty ? <><Save className="w-4 h-4 mr-1" />Salvar</> : <><CheckCircle2 className="w-4 h-4 mr-1" />Salvo</>}
            </Button>
          </div>
        </div>

        <div className="max-w-5xl mx-auto px-4 pb-3 flex gap-2 overflow-x-auto scrollbar-none">
          {[
            { id: "planos" as TabId,    label: "Planos",    icon: Zap,      count: cfg.plans.length },
            { id: "acoes" as TabId,     label: "Custos",    icon: Coins,    count: cfg.actions.length },
            { id: "pacotes" as TabId,   label: "Pacotes",   icon: Package,  count: cfg.coinPacks.length },
            { id: "historico" as TabId, label: "Histórico", icon: History,  count: null as number | null },
            { id: "backup" as TabId,    label: "Backup",    icon: Download, count: null as number | null },
          ].map((t) => {
            const Ic = t.icon;
            const active = tab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap border transition ${
                  active
                    ? "bg-emerald-500 text-black border-emerald-500"
                    : "bg-[#1A1A1B] border-white/10 text-gray-300 hover:border-white/30"
                }`}
              >
                <Ic className="w-3.5 h-3.5" />
                {t.label}
                {t.count !== null && (
                  <span className={`ml-1 text-[10px] ${active ? "text-black/70" : "text-gray-500"}`}>({t.count})</span>
                )}
              </button>
            );
          })}
          <div className="ml-auto flex items-center text-[11px] gap-1 text-gray-400 pl-3">
            {remoteOk === false ? <CloudOff className="w-3.5 h-3.5 text-amber-400" /> : <Cloud className="w-3.5 h-3.5 text-emerald-400" />}
            {summary && `${summary.plansOn}/${cfg.plans.length} planos • ${summary.actionsOn}/${cfg.actions.length} ações • ${summary.packsOn}/${cfg.coinPacks.length} pacotes`}
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-6 space-y-4">
        {tab === "planos" && <PlansEditor plans={cfg.plans} onChange={(plans) => update({ plans })} />}
        {tab === "acoes" && <ActionsEditor actions={cfg.actions} onChange={(actions) => update({ actions })} />}
        {tab === "pacotes" && <PacksEditor packs={cfg.coinPacks} onChange={(coinPacks) => update({ coinPacks })} />}
        {tab === "historico" && <HistoryTab />}
        {tab === "backup" && <BackupTab cfg={cfg} onImport={applyImported} />}
      </main>

      <div
        className="fixed bottom-0 inset-x-0 z-40 md:hidden bg-[#0A0A0B]/95 backdrop-blur border-t border-white/10 px-4 py-3 flex gap-2"
        style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 0.75rem)" }}
      >
        <Button variant="ghost" size="sm" onClick={handleReset} className="flex-1 border border-white/10">
          <RotateCcw className="w-4 h-4 mr-1" /> Padrão
        </Button>
        <Button
          size="sm"
          onClick={handleSave}
          disabled={!dirty || saving}
          className="flex-1 bg-emerald-500 hover:bg-emerald-400 text-black font-semibold"
        >
          {saving ? "Salvando..." : dirty ? "Salvar alterações" : "Tudo salvo"}
        </Button>
      </div>
    </div>
  );
}

/* --------------------------- Editores --------------------------- */

function NumberField({ value, onChange, step = 1, min = 0, prefix, suffix }: {
  value: number; onChange: (v: number) => void; step?: number; min?: number; prefix?: string; suffix?: string;
}) {
  return (
    <div className="flex items-center bg-black/40 border border-white/10 rounded-lg overflow-hidden">
      {prefix && <span className="px-2 text-[11px] text-gray-400">{prefix}</span>}
      <Input
        type="number"
        inputMode="decimal"
        step={step}
        min={min}
        value={Number.isFinite(value) ? value : 0}
        onChange={(e) => onChange(parseFloat(e.target.value || "0"))}
        className="h-9 border-0 bg-transparent px-2 text-sm focus-visible:ring-0"
      />
      {suffix && <span className="px-2 text-[11px] text-gray-400">{suffix}</span>}
    </div>
  );
}

function Toggle({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!on)}
      className={`w-10 h-5 rounded-full relative transition ${on ? "bg-emerald-500" : "bg-white/15"}`}
      aria-pressed={on}
    >
      <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-transform ${on ? "translate-x-5" : ""}`} />
    </button>
  );
}

function PlansEditor({ plans, onChange }: { plans: PlanConfig[]; onChange: (p: PlanConfig[]) => void }) {
  const upd = (id: string, patch: Partial<PlanConfig>) =>
    onChange(plans.map((p) => (p.id === id ? { ...p, ...patch } : p)));
  return (
    <div className="grid gap-3 md:grid-cols-2">
      {plans.map((p) => (
        <div key={p.id} className="bg-[#1A1A1B] border border-white/10 rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-bold flex items-center gap-2">
                {p.name}
                <span className="text-[10px] uppercase text-gray-500">{p.id}</span>
              </div>
            </div>
            <Toggle on={p.enabled} onChange={(v) => upd(p.id, { enabled: v })} />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <label className="text-[11px] text-gray-400 space-y-1">
              Mensal (PIX)
              <NumberField prefix="R$" step={0.1} value={p.priceMonthlyBRL} onChange={(v) => upd(p.id, { priceMonthlyBRL: v })} />
            </label>
            <label className="text-[11px] text-gray-400 space-y-1">
              Anual (12x -20%)
              <NumberField prefix="R$" step={0.1} value={p.priceYearlyBRL} onChange={(v) => upd(p.id, { priceYearlyBRL: v })} />
            </label>
            <label className="text-[11px] text-gray-400 space-y-1">
              Moedas/mês
              <NumberField suffix="🪙" value={p.coinsMonthly} onChange={(v) => upd(p.id, { coinsMonthly: v })} />
            </label>
            <label className="text-[11px] text-gray-400 space-y-1">
              Anúncios grátis/mês
              <NumberField value={p.freeAdsMonthly} onChange={(v) => upd(p.id, { freeAdsMonthly: v })} />
            </label>
          </div>
        </div>
      ))}
    </div>
  );
}

function ActionsEditor({ actions, onChange }: { actions: ActionCost[]; onChange: (a: ActionCost[]) => void }) {
  const upd = (key: string, patch: Partial<ActionCost>) =>
    onChange(actions.map((a) => (a.key === key ? { ...a, ...patch } : a)));
  return (
    <div className="bg-[#1A1A1B] border border-white/10 rounded-xl divide-y divide-white/5">
      {actions.map((a) => (
        <div key={a.key} className="p-3 flex items-center gap-3">
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium truncate">{a.label}</div>
            <div className="text-[10px] text-gray-500 font-mono">{a.key}</div>
          </div>
          <div className="w-28">
            <NumberField suffix="🪙" value={a.coins} onChange={(v) => upd(a.key, { coins: v })} />
          </div>
          <Toggle on={a.enabled} onChange={(v) => upd(a.key, { enabled: v })} />
        </div>
      ))}
    </div>
  );
}

function PacksEditor({ packs, onChange }: { packs: CoinPack[]; onChange: (p: CoinPack[]) => void }) {
  const upd = (id: string, patch: Partial<CoinPack>) =>
    onChange(packs.map((p) => (p.id === id ? { ...p, ...patch } : p)));
  return (
    <div className="grid gap-3 md:grid-cols-2">
      {packs.map((p) => (
        <div key={p.id} className="bg-[#1A1A1B] border border-white/10 rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <div className="text-sm font-bold truncate">{p.name}</div>
              <div className="text-[10px] text-gray-500 font-mono">ID: {p.id}</div>
            </div>
            <Toggle on={p.enabled} onChange={(v) => upd(p.id, { enabled: v })} />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <label className="text-[11px] text-gray-400 space-y-1">
              Preço
              <NumberField prefix="R$" step={0.1} value={p.priceBRL} onChange={(v) => upd(p.id, { priceBRL: v })} />
            </label>
            <label className="text-[11px] text-gray-400 space-y-1">
              Moedas
              <NumberField suffix="🪙" value={p.coins} onChange={(v) => upd(p.id, { coins: v })} />
            </label>
            <label className="text-[11px] text-gray-400 space-y-1 col-span-1">
              Bônus
              <Input value={p.bonusLabel} onChange={(e) => upd(p.id, { bonusLabel: e.target.value })} className="h-9 bg-black/40 border-white/10 text-sm" />
            </label>
            <label className="text-[11px] text-gray-400 space-y-1 col-span-1">
              Destaque
              <Input placeholder="(opcional)" value={p.highlight ?? ""} onChange={(e) => upd(p.id, { highlight: e.target.value || undefined })} className="h-9 bg-black/40 border-white/10 text-sm" />
            </label>
          </div>
        </div>
      ))}
    </div>
  );
}

/* --------------------------- Histórico --------------------------- */

function HistoryTab() {
  const [entries, setEntries] = useState<MonetizationAuditEntry[] | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [restoring, setRestoring] = useState<string | null>(null);

  const load = () => { setEntries(null); fetchMonetizationHistory(80).then(setEntries); };
  useEffect(() => { load(); }, []);

  const handleRestore = async (e: MonetizationAuditEntry) => {
    if (!confirm(`Reverter para o snapshot de ${new Date(e.created_at).toLocaleString("pt-BR")}?`)) return;
    setRestoring(e.id);
    const res = await restoreMonetizationSnapshot(e);
    setRestoring(null);
    if (res.remote) toast.success("Snapshot restaurado ✓");
    else toast.warning("Restaurado localmente. Supabase indisponível.", { description: res.error?.slice(0, 140) });
    load();
  };

  if (entries === null) {
    return <div className="text-sm text-gray-400 py-10 text-center">Carregando histórico…</div>;
  }
  if (entries.length === 0) {
    return (
      <div className="bg-[#1A1A1B] border border-white/10 rounded-xl p-8 text-center text-sm text-gray-400">
        Nenhuma alteração registrada ainda.
        <div className="text-[11px] text-gray-500 mt-2">
          Alterações passam a ser registradas assim que a tabela <code className="text-emerald-400">monetization_audit</code> for criada.
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {entries.map((e) => {
        const open = expanded === e.id;
        return (
          <div key={e.id} className="bg-[#1A1A1B] border border-white/10 rounded-xl overflow-hidden">
            <button
              onClick={() => setExpanded(open ? null : e.id)}
              className="w-full p-3 text-left flex items-center gap-3 hover:bg-white/5"
            >
              <History className="w-4 h-4 text-emerald-400 shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate">{e.summary}</div>
                <div className="text-[11px] text-gray-400 flex items-center gap-2 flex-wrap">
                  <span>{new Date(e.created_at).toLocaleString("pt-BR")}</span>
                  <span className="text-gray-600">•</span>
                  <User className="w-3 h-3" />
                  <span className="truncate">{e.changed_by_email || e.changed_by || "sistema"}</span>
                </div>
              </div>
              <span className="text-[11px] text-gray-400 shrink-0">{e.diff?.length ?? 0} campos</span>
            </button>
            {open && (
              <div className="border-t border-white/10 p-3 space-y-2 bg-black/30">
                <div className="max-h-64 overflow-auto scrollbar-none space-y-1">
                  {(e.diff ?? []).map((d, i) => (
                    <div key={i} className="text-[11px] font-mono grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] gap-2 items-center">
                      <span className="text-gray-500 truncate">{d.path}</span>
                      <span className="text-red-400 line-through truncate max-w-[140px]">{formatVal(d.before)}</span>
                      <span className="text-emerald-400 truncate">{formatVal(d.after)}</span>
                    </div>
                  ))}
                </div>
                <div className="flex justify-end pt-2 border-t border-white/5">
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={restoring === e.id}
                    onClick={() => handleRestore(e)}
                    className="border-amber-500/40 text-amber-300 hover:bg-amber-500/10"
                  >
                    <Undo2 className="w-3.5 h-3.5 mr-1" />
                    {restoring === e.id ? "Restaurando…" : "Restaurar este snapshot"}
                  </Button>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function formatVal(v: unknown): string {
  if (v === null || v === undefined) return "—";
  if (typeof v === "object") return JSON.stringify(v);
  return String(v);
}

/* --------------------------- Backup (JSON) --------------------------- */

function BackupTab({ cfg, onImport }: { cfg: MonetizationConfig; onImport: (c: MonetizationConfig) => void }) {
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [preview, setPreview] = useState<string>("");

  const handleExport = () => {
    const raw = exportMonetizationJSON(cfg);
    const blob = new Blob([raw], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `fixxer-monetization-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 500);
    toast.success("JSON exportado");
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(exportMonetizationJSON(cfg));
      toast.success("JSON copiado para a área de transferência");
    } catch { toast.error("Falha ao copiar"); }
  };

  const handleFile = async (f: File) => {
    try {
      const text = await f.text();
      const parsed = parseMonetizationJSON(text);
      setPreview(exportMonetizationJSON(parsed).slice(0, 400));
      onImport(parsed);
    } catch (e: any) {
      toast.error("Arquivo inválido", { description: e?.message?.slice(0, 140) });
    }
  };

  const handlePasteImport = () => {
    const raw = window.prompt("Cole o JSON de configuração:");
    if (!raw) return;
    try {
      const parsed = parseMonetizationJSON(raw);
      onImport(parsed);
    } catch (e: any) {
      toast.error("JSON inválido", { description: e?.message?.slice(0, 140) });
    }
  };

  return (
    <div className="grid gap-3 md:grid-cols-2">
      <div className="bg-[#1A1A1B] border border-white/10 rounded-xl p-4 space-y-3">
        <div className="flex items-center gap-2 text-sm font-bold">
          <Download className="w-4 h-4 text-emerald-400" /> Exportar configuração
        </div>
        <p className="text-[12px] text-gray-400">
          Baixa a configuração atual como um arquivo JSON. Útil para backup, versionamento em Git ou migração para outro ambiente.
        </p>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" onClick={handleExport} className="bg-emerald-500 hover:bg-emerald-400 text-black font-semibold">
            <Download className="w-4 h-4 mr-1" /> Baixar JSON
          </Button>
          <Button size="sm" variant="outline" onClick={handleCopy} className="border-white/10">
            Copiar JSON
          </Button>
        </div>
        <div className="text-[10px] text-gray-500">Última atualização: {new Date(cfg.updatedAt).toLocaleString("pt-BR")}</div>
      </div>

      <div className="bg-[#1A1A1B] border border-white/10 rounded-xl p-4 space-y-3">
        <div className="flex items-center gap-2 text-sm font-bold">
          <Upload className="w-4 h-4 text-amber-400" /> Importar configuração
        </div>
        <p className="text-[12px] text-gray-400">
          Carrega um JSON e substitui a configuração local. Nenhuma alteração é aplicada até você clicar em <b>Salvar</b> no topo.
        </p>
        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) handleFile(f);
            e.currentTarget.value = "";
          }}
        />
        <div className="flex flex-wrap gap-2">
          <Button size="sm" onClick={() => fileRef.current?.click()} className="bg-amber-500 hover:bg-amber-400 text-black font-semibold">
            <Upload className="w-4 h-4 mr-1" /> Selecionar arquivo
          </Button>
          <Button size="sm" variant="outline" onClick={handlePasteImport} className="border-white/10">
            Colar JSON
          </Button>
        </div>
        {preview && (
          <pre className="mt-2 text-[10px] font-mono text-gray-400 bg-black/50 border border-white/10 rounded p-2 max-h-40 overflow-auto scrollbar-none">
            {preview}…
          </pre>
        )}
      </div>
    </div>
  );
}
