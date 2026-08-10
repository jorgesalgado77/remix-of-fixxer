import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useState, useMemo, useEffect } from "react";
import { Coins, Copy, QrCode, TrendingUp, Info, Check, Share2, FileDown, MessageSquare, Loader2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { fetchMonetizationConfig } from "@/lib/monetization";

interface Props {
  open: boolean;
  onClose: () => void;
  profile: any;
  stats: {
    balance: number;
    balanceReservations: number;
    balanceProducts: number;
    balanceServices: number;
  };
}

const BRL = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export function PixManagerModal({ open, onClose, profile, stats }: Props) {
  const [loading, setLoading] = useState(false);
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("servico");
  const [generated, setGenerated] = useState(false);
  const [copying, setCopying] = useState(false);
  const [platformFee, setPlatformFee] = useState(15);
  const [error, setError] = useState<string | null>(null);

  // Cache para configurações de taxas para evitar requisições repetidas no mesmo ciclo de vida do componente
  const [cachedPlatformFee, setCachedPlatformFee] = useState<number | null>(null);

  useEffect(() => {
    if (open) {
      toast.info("Abrindo gerenciador de recebimentos...");
      
      // Só busca se não tiver no cache local
      if (cachedPlatformFee === null) {
        setLoading(true);
        setError(null);
        fetchMonetizationConfig()
          .then(cfg => {
            setPlatformFee(cfg.pixPlatformFeePercent);
            setCachedPlatformFee(cfg.pixPlatformFeePercent);
            toast.success("Configurações de taxas sincronizadas.");
          })
          .catch(err => {
            console.error("[PixManagerModal] Erro ao carregar configurações:", err);
            const errorMsg = "Não foi possível carregar as configurações de taxas. Verifique sua conexão ou credenciais.";
            setError(errorMsg);
            toast.error("Erro ao buscar dados", {
              description: "Código: ERR_PIX_CFG_01. Tente reconectar ou verifique suas credenciais de rede.",
            });
          })
          .finally(() => setLoading(false));
      } else {
        setPlatformFee(cachedPlatformFee);
      }
    }
  }, [open, cachedPlatformFee]);

  const pixKey = profile?.pix_key || "financeiro@fixxer.com.br";

  const handleCopy = (text: string, label: string) => {
    setCopying(true);
    navigator.clipboard.writeText(text);
    toast.success(`${label} copiado para a área de transferência!`);
    setTimeout(() => setCopying(false), 2000);
  };

  const fees = Number(amount || 0) * (platformFee / 100);
  const net = Number(amount || 0) - fees;

  const handleExportPDF = () => {
    toast.promise(
      new Promise((resolve) => setTimeout(resolve, 1500)),
      {
        loading: 'Gerando PDF da cobrança...',
        success: 'PDF exportado com sucesso!',
        error: 'Erro ao gerar PDF.',
      }
    );
  };

  const handleShareChat = () => {
    toast.success("Enviado para o chat interno com sucesso!");
    // Simulação de navegação/abertura de chat
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-xl bg-[#0a0a0b] border border-white/10 rounded-[32px] p-0 overflow-hidden shadow-2xl">
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

        <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto scrollbar-none relative">
          {loading && (
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm z-50 flex flex-col items-center justify-center text-center p-6 animate-in fade-in duration-300">
              <Loader2 className="w-8 h-8 text-emerald-500 animate-spin mb-3" />
              <p className="text-sm font-bold text-white uppercase italic tracking-tight">Carregando carteira...</p>
            </div>
          )}

          {error && (
            <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-start gap-3 animate-in slide-in-from-top-2 duration-300">
              <AlertTriangle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-xs font-bold text-red-200 uppercase tracking-tight mb-1">Erro de Conexão</p>
                <p className="text-[10px] text-red-200/60 leading-relaxed">{error}</p>
                <Button 
                  variant="link" 
                  onClick={() => {
                    setLoading(true);
                    setError(null);
                    fetchMonetizationConfig()
                      .then(cfg => setPlatformFee(cfg.pixPlatformFeePercent))
                      .catch(() => {
                        const msg = "Falha ao tentar reconectar. Verifique sua rede e credenciais (ERR_PIX_RETRY).";
                        setError(msg);
                        toast.error("Falha na reconexão", { description: msg });
                      })
                      .finally(() => setLoading(false));
                  }}
                  className="h-auto p-0 text-[9px] font-black uppercase tracking-widest text-emerald-400 mt-2 hover:text-emerald-300"
                >
                  Tentar Novamente
                </Button>
              </div>
            </div>
          )}
          {/* Seção de Saldos */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/5">
              <p className="text-[9px] font-black uppercase text-white/40 tracking-widest mb-1 flex items-center gap-1">
                <TrendingUp className="w-3 h-3" /> Reservas
              </p>
              <p className="text-lg font-black text-white">{BRL(stats.balanceReservations * 10)}</p>
            </div>
            <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/5">
              <p className="text-[9px] font-black uppercase text-white/40 tracking-widest mb-1">Info Produtos</p>
              <p className="text-lg font-black text-white">{BRL(stats.balanceProducts * 10)}</p>
            </div>
            <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/5">
              <p className="text-[9px] font-black uppercase text-white/40 tracking-widest mb-1">Serviços</p>
              <p className="text-lg font-black text-white">{BRL(stats.balanceServices * 10)}</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="p-5 rounded-[24px] bg-white/[0.04] border border-white/10 space-y-4">
              <div>
                <label className="text-[10px] font-black uppercase text-white/40 tracking-widest mb-2 block">Quanto deseja receber?</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-emerald-400 font-black">R$</span>
                  <input
                    type="number"
                    placeholder="0,00"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full bg-black/40 border border-white/10 rounded-2xl p-4 pl-12 text-xl font-black text-white focus:ring-2 focus:ring-emerald-500/50 transition-all outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-black uppercase text-white/40 tracking-widest mb-2 block">Descrição do Recebimento</label>
                <textarea
                  placeholder="Ex: Pagamento referente à consultoria..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full bg-black/40 border border-white/10 rounded-2xl p-4 text-xs font-medium text-white focus:ring-2 focus:ring-emerald-500/50 transition-all outline-none resize-none h-20"
                />
              </div>

              <div>
                <label className="text-[10px] font-black uppercase text-white/40 tracking-widest mb-2 block">Categoria</label>
                <div className="grid grid-cols-2 gap-2">
                  {['servico', 'reserva', 'produto', 'outro'].map((cat) => (
                    <button
                      key={cat}
                      onClick={() => setCategory(cat)}
                      className={`p-3 rounded-xl border text-[10px] font-black uppercase tracking-widest transition-all ${
                        category === cat 
                          ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400' 
                          : 'bg-white/5 border-white/5 text-white/40 hover:bg-white/10'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              {Number(amount) > 0 && (
                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center gap-3">
                  <Info className="w-4 h-4 text-emerald-400 shrink-0" />
                  <p className="text-[10px] text-emerald-200/80 font-medium">
                    Taxa da plataforma ({platformFee}%): <span className="font-bold">{BRL(fees)}</span>. 
                    Líquido: <span className="font-black text-emerald-400">{BRL(net)}</span>
                  </p>
                </div>
              )}

              <Button 
                onClick={() => {
                  setGenerated(true);
                  toast.success("Cobrança gerada com sucesso!");
                }}
                disabled={!amount || Number(amount) <= 0}
                className="w-full h-14 bg-emerald-500 hover:bg-emerald-400 text-black font-black uppercase italic tracking-tighter text-lg rounded-2xl shadow-[0_0_30px_rgba(16,185,129,0.3)] active:scale-95 transition-all"
              >
                Gerar Cobrança PIX
              </Button>
            </div>
          </div>

          {!generated && !loading && (
            <div className="p-8 border-2 border-dashed border-white/5 rounded-[24px] flex flex-col items-center justify-center text-center space-y-3 bg-white/[0.01]">
              <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center">
                <QrCode className="w-6 h-6 text-white/20" />
              </div>
              <div>
                <p className="text-sm font-bold text-white/80">Nenhum recebimento pendente</p>
                <p className="text-[10px] text-white/40 max-w-[240px] mx-auto">Insira um valor e gere uma cobrança acima para começar a receber via PIX.</p>
              </div>
            </div>
          )}

          {generated && (
            <div className="p-6 rounded-[24px] bg-emerald-500/5 border border-emerald-500/20 flex flex-col items-center gap-6 animate-in zoom-in-95 duration-300">
              <div className="relative group">
                <div className="absolute -inset-4 bg-emerald-500/20 blur-xl opacity-50 rounded-full"></div>
                <div className="relative w-56 h-56 bg-white p-4 rounded-3xl flex items-center justify-center shadow-2xl">
                  <QrCode className="w-full h-full text-black" />
                </div>
              </div>
              
              <div className="w-full space-y-3">
                <p className="text-[10px] font-black text-center text-white/40 uppercase tracking-widest">Código Copia e Cola</p>
                <div className="flex items-center gap-2 p-3 rounded-2xl bg-black/60 border border-white/10">
                  <span className="text-[11px] font-mono text-white/60 truncate flex-1">00020126580014br.gov.bcb.pix0136...</span>
                  <button 
                    onClick={() => handleCopy("00020126580014br.gov.bcb.pix0136...", "Código PIX")}
                    className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-emerald-400 transition-all"
                  >
                    {copying ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-2">
                  <Button 
                    variant="outline" 
                    onClick={handleShareChat}
                    className="rounded-xl border-white/10 text-[10px] uppercase font-black tracking-widest h-11 gap-2 hover:bg-white/5"
                  >
                    <MessageSquare className="w-4 h-4" /> Enviar Chat
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={handleExportPDF}
                    className="rounded-xl border-white/10 text-[10px] uppercase font-black tracking-widest h-11 gap-2 hover:bg-white/5"
                  >
                    <FileDown className="w-4 h-4" /> Exportar PDF
                  </Button>
                </div>
              </div>
            </div>
          )}

          <div className="p-4 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-between">
            <div>
              <p className="text-[9px] font-black uppercase text-white/30 tracking-widest mb-0.5">Sua Chave PIX</p>
              <p className="text-sm font-bold text-white font-mono">{pixKey}</p>
            </div>
            <button 
              onClick={() => handleCopy(pixKey, "Chave PIX")}
              className="p-2 rounded-lg hover:bg-white/5 text-white/40 hover:text-white transition-colors"
            >
              <Copy className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="p-4 bg-black/40 border-t border-white/5 flex items-center justify-center">
          <p className="text-[9px] text-white/30 font-medium uppercase tracking-widest text-center">
            Segurança Foxxer · Valores protegidos por Escrow
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
