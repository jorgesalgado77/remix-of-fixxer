import { useEffect, useState } from "react";
import { Star, ShieldCheck, Loader2, Coins, ChevronDown } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { supabaseExternal as supabase } from "@/lib/supabaseExternal";
import {
  fetchMonetizationConfig,
  getActionCost,
  spendCoinsForAction,
} from "@/lib/monetization";
import { getCachedBalance, subscribeBalance } from "@/lib/coins";

interface ReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetId: string;
  targetName: string;
  userRole: string;
  orderId: string;
}

export function ReviewModal({ isOpen, onClose, targetId, targetName, userRole, orderId }: ReviewModalProps) {
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [loading, setLoading] = useState(false);

  const [balance, setBalance] = useState<number>(getCachedBalance());
  const [cost, setCost] = useState<number>(getActionCost("reply_review")?.coins ?? 10);
  const [showCostPanel, setShowCostPanel] = useState(false);

  useEffect(() => {
    fetchMonetizationConfig().then(() => {
      setCost(getActionCost("reply_review")?.coins ?? 10);
    });
    const unsub = subscribeBalance((b) => setBalance(b));
    return unsub;
  }, []);

  const getMetrics = () => {
    if (userRole === "lojista") return ["Pontualidade", "Qualidade", "Limpeza"];
    if (userRole === "prestador") return ["Informações", "Recepção"];
    return ["Cordialidade", "Acabamento"];
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Não autenticado");

      // Cobrança de moedas por resposta/avaliação (configurável em /admin/monetizacao)
      if (cost > 0) {
        const spent = await spendCoinsForAction(user.id, "reply_review", orderId);
        if (!spent.ok) {
          if (spent.reason === "insufficient") {
            toast.error(`Saldo insuficiente. Necessário: ${cost} moedas.`);
          } else if (spent.reason === "disabled") {
            // ação desabilitada globalmente pelo admin — segue sem cobrar
          } else {
            toast.error("Falha ao debitar moedas", { description: spent.error });
            setLoading(false); return;
          }
        }
      }

      const { error } = await supabase
        .from('reviews')
        .insert({
          reviewer_id: user.id,
          target_id: targetId,
          order_id: orderId || null,
          rating: rating,
          comment: comment,
          metrics: { 
            labels: getMetrics(),
            user_role: userRole,
            platform: 'web'
          }
        });

      if (error) throw error;

      toast.success("Avaliação enviada com sucesso!");
      onClose();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-[#0A0A0B] border-white/10 text-white max-w-[90vw] md:max-w-md rounded-3xl">
        <DialogHeader>
          <DialogTitle className="text-white uppercase italic font-black flex items-center gap-2">
            <Star className="w-5 h-5 text-[#00FF87]" />
            Avaliar {targetName}
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6 py-4">
          <div className="flex flex-col items-center gap-4">
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  onClick={() => setRating(star)}
                  className="transition-transform active:scale-90"
                >
                  <Star
                    className={`w-8 h-8 ${
                      star <= rating ? "fill-[#00FF87] text-[#00FF87]" : "text-white/10"
                    }`}
                  />
                </button>
              ))}
            </div>
            <span className="text-sm font-black text-[#00FF87] uppercase italic">
              Nota: {rating.toFixed(1)}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {getMetrics().map((metric) => (
              <div key={metric} className="bg-white/5 border border-white/10 rounded-xl p-2 text-center">
                <span className="text-[10px] font-bold text-muted-foreground uppercase">{metric}</span>
              </div>
            ))}
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-bold uppercase text-muted-foreground ml-1">Comentário (Opcional)</label>
            <textarea
              className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-xs text-white outline-none focus:border-[#00FF87] min-h-[100px] resize-none"
              placeholder="Conte como foi sua experiência..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
            />
          </div>

          <div className="p-4 rounded-2xl bg-emerald-500/5 border border-emerald-500/10 flex items-start gap-3">
            <ShieldCheck className="w-4 h-4 text-[#00FF87] shrink-0 mt-0.5" />
            <p className="text-[9px] text-emerald-400 font-bold uppercase leading-tight">
              Sua avaliação ajuda a manter a comunidade FIXXER segura e transparente.
            </p>
          </div>

          {/* Sanfona de custo em moedas */}
          <div className="rounded-2xl bg-amber-500/5 border border-amber-500/20 overflow-hidden">
            <button
              type="button"
              onClick={() => setShowCostPanel((v) => !v)}
              className="w-full flex items-center justify-between gap-2 px-4 py-3 text-left"
            >
              <span className="flex items-center gap-2 text-[11px] font-black uppercase tracking-widest text-amber-300">
                <Coins className="w-3.5 h-3.5" /> Custo desta ação: {cost} moedas
              </span>
              <ChevronDown className={`w-4 h-4 text-amber-300 transition ${showCostPanel ? "rotate-180" : ""}`} />
            </button>
            {showCostPanel && (
              <div className="px-4 pb-3 space-y-1 text-[10px] text-white/70">
                <p>Serão debitadas <b className="text-amber-300">{cost} moedas</b> ao confirmar a avaliação.</p>
                <p>Seu saldo atual: <b className="text-white">{balance} moedas</b>.</p>
                {balance < cost && (
                  <p className="text-[10px] text-[#FF3B30] font-black uppercase">⚠️ Saldo insuficiente — recarregue na Loja de Moedas.</p>
                )}
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <button
            onClick={handleSubmit}
            disabled={loading || balance < cost}
            className="w-full py-4 rounded-2xl bg-[#00FF87] text-black font-black uppercase italic text-xs hover:shadow-[0_0_20px_rgba(0,255,135,0.4)] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : `Confirmar (−${cost} moedas)`}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
