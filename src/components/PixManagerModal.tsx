import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from "@/components/ui/dialog";
import { useState, useEffect } from "react";
import { Coins, Copy, QrCode, TrendingUp, Info, Check, Share2, FileDown, MessageSquare, Loader2, AlertTriangle, X, Settings } from "lucide-react";
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
  const [period, setPeriod] = useState("30");
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
              <DialogTitle className="text-xl font-black text-white tracking-tight uppercase italic">Receber via PIX</DialogTitle>
            </div>
            <p className="text-xs text-white/50 font-medium">Gere cobranças instantâneas e gerencie seus recebimentos.</p>
          </DialogHeader>
        </div>

        <div className="p-6 space-y-6 overflow-y-auto scrollbar-none relative flex-1">
          {/* Filtros de Período */}
          <Tabs value={period} onValueChange={setPeriod} className="w-full">
            <TabsList className="grid w-full grid-cols-4 bg-white/5 p-1 rounded-xl">
              {['7', '15', '30', 'custom'].map((p) => (
                <TabsTrigger key={p} value={p} className="text-[10px] uppercase font-bold rounded-lg data-[state=active]:bg-white/10">
                  {p === 'custom' ? '...' : `${p}d`}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>

          {/* Saldos Reais */}
          {isLoadingStats || loading ? (
             <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
               {[1,2,3].map(i => <Skeleton key={i} className="h-20 w-full rounded-2xl bg-white/5" />)}
             </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/5">
                <p className="text-[9px] font-black uppercase text-white/40 tracking-widest mb-1">Reservas</p>
                <p className="text-lg font-black text-white">{BRL(stats?.balanceReservations || 0)}</p>
              </div>
              <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/5">
                <p className="text-[9px] font-black uppercase text-white/40 tracking-widest mb-1">Info Produtos</p>
                <p className="text-lg font-black text-white">{BRL(stats?.balanceProducts || 0)}</p>
              </div>
              <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/5">
                <p className="text-[9px] font-black uppercase text-white/40 tracking-widest mb-1">Serviços</p>
                <p className="text-lg font-black text-white">{BRL(stats?.balanceServices || 0)}</p>
              </div>
            </div>
          )}

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
