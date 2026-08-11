import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from "@/components/ui/dialog";
import { useState, useEffect, useRef } from "react";
import { Coins, Copy, QrCode, TrendingUp, Info, Check, Share2, FileDown, MessageSquare, Loader2, AlertTriangle, X, Settings, RefreshCw, Calendar, Search, DollarSign } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useNavigate } from "@tanstack/react-router";
import { fetchMonetizationConfig } from "@/lib/monetization";

interface Props {
  open: boolean;
  onClose: () => void;
  profile: any;
  stats: any;
  isLoadingStats?: boolean;
}

const BRL = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export function PixManagerModal({ open, onClose, profile, stats, isLoadingStats }: Props) {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [generated, setGenerated] = useState(false);
  const [copying, setCopying] = useState(false);
  const [platformFee, setPlatformFee] = useState(15);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setLoading(true);
      fetchMonetizationConfig()
        .then(cfg => setPlatformFee(cfg.pixPlatformFeePercent))
        .catch(() => setError("Erro ao carregar taxas."))
        .finally(() => setLoading(false));
    }
  }, [open]);

  // Sinaliza recarga manual para exibir toast de sucesso quando terminar
  const reloadingRef = useRef(false);
  useEffect(() => {
    if (reloadingRef.current && !stats?.loading) {
      reloadingRef.current = false;
      if (stats?.error) toast.error("Falha ao recarregar saldos", { description: stats.error });
      else toast.success("Saldos atualizados com sucesso");
    }
  }, [stats?.loading, stats?.error]);

  const handleReload = () => {
    reloadingRef.current = true;
    stats?.reload?.();
  };

  const periodLabel = (p: string) =>
    p === "custom" ? "intervalo personalizado" : `últimos ${p} dias`;

  const handlePeriodChange = (v: string) => {
    stats?.setPeriod?.(v);
    toast.info(`Período alterado: ${periodLabel(v)}`);
  };

  const entries: any[] = stats?.periodEntries ?? [];

  const exportCSV = () => {
    if (!entries.length) {
      toast.error("Nenhuma transação no período selecionado para exportar.");
      return;
    }
    const rows = [
      ["Data", "Tipo", "Descrição", "Valor (BRL)"],
      ...entries.map((e) => [
        e.date ? new Date(e.date).toLocaleDateString("pt-BR") : "-",
        e.type,
        String(e.label ?? "").replace(/[";\n]/g, " "),
        Number(e.amount || 0).toFixed(2).replace(".", ","),
      ]),
    ];
    const csv = "\uFEFF" + rows.map((r) => r.map((c) => `"${c}"`).join(";")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8;" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `extrato-pix-${stats?.period || "30"}-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Extrato exportado em CSV");
  };

  const pixKey = profile?.pix_key;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-xl bg-[#0a0a0b] border border-white/10 rounded-[32px] p-0 overflow-hidden shadow-2xl max-h-[90vh] flex flex-col focus-visible:outline-none">
        <DialogClose className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground z-10 text-white">
          <X className="h-4 w-4" />
          <span className="sr-only">Fechar</span>
        </DialogClose>
        
        <div className="bg-gradient-to-br from-emerald-500/20 via-transparent to-transparent p-6 border-b border-white/5">
          <DialogHeader>
            <div className="flex items-center gap-3 mb-1">
              <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center">
                <QrCode className="w-5 h-5 text-emerald-400" />
              </div>
              <DialogTitle className="text-xl font-black text-white tracking-tight uppercase italic flex items-center gap-2">
                Receber via PIX
                {(isLoadingStats || loading) && <Loader2 className="w-4 h-4 animate-spin text-emerald-400/50" />}
              </DialogTitle>
            </div>
            <div className="flex items-center justify-between">
              <p className="text-xs text-white/50 font-medium">Gere cobranças instantâneas e gerencie seus recebimentos.</p>
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={handleReload} 
                disabled={isLoadingStats || loading}
                className="h-8 w-8 rounded-xl bg-white/5 hover:bg-white/10 text-white/70 hover:text-emerald-400 transition-all active:scale-90"
                title="Recarregar saldos"
              >
                <RefreshCw className={`w-4 h-4 ${(isLoadingStats || loading) ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </DialogHeader>
        </div>

        <div className="p-6 space-y-6 overflow-y-auto scrollbar-none relative flex-1">
          {/* Filtros de Período */}
          <div className="space-y-4">
            <Tabs value={stats?.period || "30"} onValueChange={handlePeriodChange} className="w-full">
              <TabsList className="grid w-full grid-cols-4 bg-white/5 p-1 rounded-xl">
                {['7', '15', '30', 'custom'].map((p) => (
                  <TabsTrigger key={p} value={p} className="text-[10px] uppercase font-bold rounded-lg data-[state=active]:bg-white/10 transition-all">
                    {p === 'custom' ? <Calendar className="w-3 h-3" /> : `${p}d`}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>

            {stats?.period === "custom" && (
              <div className="flex items-center gap-2 animate-in slide-in-from-top-2 duration-300">
                <div className="flex-1 space-y-1">
                  <p className="text-[8px] font-black uppercase text-white/30 tracking-widest px-1">Início</p>
                  <input 
                    type="date" 
                    value={stats?.customRange?.start || ''}
                    onChange={(e) => stats?.setCustomRange?.({ ...stats.customRange, start: e.target.value })}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500/50 transition-colors [color-scheme:dark]"
                  />
                </div>
                <div className="flex-1 space-y-1">
                  <p className="text-[8px] font-black uppercase text-white/30 tracking-widest px-1">Fim</p>
                  <input 
                    type="date" 
                    value={stats?.customRange?.end || ''}
                    onChange={(e) => stats?.setCustomRange?.({ ...stats.customRange, end: e.target.value })}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500/50 transition-colors [color-scheme:dark]"
                  />
                </div>
                <div className="pt-4">
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={() => {
                      if (stats?.customRange?.start && stats?.customRange?.end && new Date(stats.customRange.start) > new Date(stats.customRange.end)) {
                        toast.error("Data inicial não pode ser maior que a final");
                        return;
                      }
                      handleReload();
                    }}
                    className="h-9 w-9 bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 rounded-lg"
                  >
                    <Search className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Erro de carregamento */}
          {(stats?.error || error) && (
            <div className="p-3 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center gap-3 animate-in fade-in">
              <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
              <p className="text-xs text-red-100 flex-1">{stats?.error || error}</p>
              <Button size="sm" variant="ghost" onClick={handleReload} className="h-7 text-[10px] uppercase font-black text-red-300 hover:text-white hover:bg-red-500/20">
                Tentar novamente
              </Button>
            </div>
          )}

          {/* Saldos Reais */}
          {isLoadingStats || loading ? (
             <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
               {[1,2,3].map(i => <Skeleton key={i} className="h-20 w-full rounded-2xl bg-white/5" />)}
             </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {[
                { label: "Reservas", value: stats?.balanceReservations, icon: TrendingUp },
                { label: "Info Produtos", value: stats?.balanceProducts, icon: Coins },
                { label: "Serviços", value: stats?.balanceServices, icon: DollarSign }
              ].map((item, idx) => (
                <div key={idx} className="p-4 rounded-2xl bg-white/[0.03] border border-white/5 group hover:bg-white/[0.05] transition-all">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-[9px] font-black uppercase text-white/40 tracking-widest">{item.label}</p>
                    <item.icon className="w-3 h-3 text-white/20 group-hover:text-emerald-400/50 transition-colors" />
                  </div>
                  {item.value === 0 && !isLoadingStats ? (
                    <div className="space-y-0.5">
                      <p className="text-lg font-black text-white/20 tracking-tighter">{BRL(0)}</p>
                      <p className="text-[8px] font-medium text-white/20 italic">Sem transações</p>
                    </div>
                  ) : (
                    <p className="text-lg font-black text-white tracking-tighter">{BRL(item.value || 0)}</p>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Extrato do período */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-black uppercase text-white/40 tracking-widest">
                Extrato do período {entries.length > 0 && <span className="text-emerald-400">({entries.length})</span>}
              </p>
              <Button
                size="sm"
                variant="ghost"
                onClick={exportCSV}
                disabled={isLoadingStats || stats?.loading || entries.length === 0}
                className="h-7 gap-1.5 text-[10px] uppercase font-black tracking-widest text-white/60 hover:text-emerald-400 hover:bg-emerald-500/10 rounded-lg disabled:opacity-30"
              >
                <FileDown className="w-3.5 h-3.5" />
                Exportar CSV
              </Button>
            </div>

            {isLoadingStats || stats?.loading ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => <Skeleton key={i} className="h-12 w-full rounded-xl bg-white/5" />)}
              </div>
            ) : entries.length === 0 ? (
              <div className="p-6 rounded-2xl bg-white/[0.02] border border-dashed border-white/10 text-center">
                <Info className="w-5 h-5 text-white/20 mx-auto mb-2" />
                <p className="text-xs font-bold text-white/40">Nenhuma transação no período selecionado</p>
                <p className="text-[10px] text-white/25 mt-0.5">Ajuste o filtro de datas para visualizar outros registros.</p>
              </div>
            ) : (
              <div className="rounded-2xl border border-white/5 divide-y divide-white/5 overflow-hidden max-h-64 overflow-y-auto scrollbar-none">
                {entries.map((e) => (
                  <div key={`${e.type}-${e.id}`} className="flex items-center gap-3 p-3 bg-white/[0.02] hover:bg-white/[0.05] transition-colors">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-white truncate">{e.label}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[9px] font-black uppercase tracking-widest text-emerald-400/70">{e.type}</span>
                        <span className="text-[9px] text-white/30">
                          {e.date ? new Date(e.date).toLocaleDateString("pt-BR") : "—"}
                        </span>
                      </div>
                    </div>
                    <p className="text-sm font-black text-white tracking-tighter shrink-0">{BRL(e.amount || 0)}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Chave PIX */}
          {!pixKey ? (
            <div className="p-4 rounded-2xl bg-yellow-500/10 border border-yellow-500/20 flex items-center justify-between">
              <div>
                <p className="text-[9px] font-black uppercase text-yellow-500/60 tracking-widest mb-0.5">Sem chave PIX configurada</p>
                <p className="text-xs text-yellow-100">Configure sua chave para receber pagamentos.</p>
              </div>
              <Button size="sm" onClick={() => navigate({ to: '/configuracoes' })} className="bg-yellow-600 hover:bg-yellow-700 text-[10px] uppercase font-black tracking-widest h-8">
                Configurar
              </Button>
            </div>
          ) : (
            <div className="p-4 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-between">
              <div>
                <p className="text-[9px] font-black uppercase text-white/30 tracking-widest mb-0.5">Sua Chave PIX</p>
                <p className="text-sm font-bold text-white font-mono">{pixKey}</p>
              </div>
              <button onClick={() => { navigator.clipboard.writeText(pixKey); toast.success("Chave copiada!"); }} className="p-2 rounded-lg hover:bg-white/5 text-white/40 hover:text-white transition-colors">
                <Copy className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
