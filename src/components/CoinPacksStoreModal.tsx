import { useMemo, useState } from "react";
import { X, Coins, Copy, Check, QrCode, Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { type CoinPack } from "@/lib/monetization";
import { useMonetization } from "@/hooks/use-monetization";
import { creditCoins } from "@/lib/coins";

interface Props { onClose: () => void }

function formatBRL(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

/** PIX Copia e Cola simulado (payload BR Code EMV simplificado, apenas texto de referência). */
function buildPixPayload(pack: CoinPack): string {
  const value = pack.priceBRL.toFixed(2);
  return `00020126360014BR.GOV.BCB.PIX0114+55FIXXER${pack.id}5204000053039865802BR5910FIXXERPAY6008SAOPAULO62070503***6304FIXX/PACK:${pack.id}/AMOUNT:${value}`;
}

export function CoinPacksStoreModal({ onClose }: Props) {
  const cfg = useMonetization();
  const packs = useMemo(() => cfg.coinPacks.filter((p) => p.enabled), [cfg]);
  const [selected, setSelected] = useState<CoinPack | null>(null);
  const [copied, setCopied] = useState(false);
  const [confirming, setConfirming] = useState(false);

  const handleCopy = async () => {
    if (!selected) return;
    try {
      await navigator.clipboard.writeText(buildPixPayload(selected));
      setCopied(true);
      toast.success("Código PIX copiado!");
      setTimeout(() => setCopied(false), 2500);
    } catch {
      toast.error("Não foi possível copiar. Copie manualmente.");
    }
  };

  const handleConfirmPayment = async () => {
    if (!selected) return;
    setConfirming(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { toast.error("Sessão expirada."); setConfirming(false); return; }
    const res = await creditCoins(user.id, selected.coins, `Compra de ${selected.name} via PIX`, "purchase_pack", selected.id);
    setConfirming(false);
    if (res.ok) {
      toast.success(`+${selected.coins.toLocaleString("pt-BR")} moedas creditadas!`);
      onClose();
    } else {
      toast.error("Erro ao creditar moedas.");
    }
  };

  return (
    <div className="fixed inset-0 z-[110] bg-black/85 backdrop-blur-md flex items-end sm:items-center justify-center" onClick={onClose}>
      <div
        className="w-full sm:max-w-2xl bg-[#141416] border border-white/10 sm:rounded-3xl rounded-t-3xl shadow-2xl overflow-hidden flex flex-col"
        style={{ maxHeight: "100dvh", height: "min(100dvh, 780px)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-5 border-b border-white/10 flex items-center justify-between bg-gradient-to-br from-amber-500/10 to-transparent">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-amber-400/15 border border-amber-400/30 flex items-center justify-center">
              <Coins className="w-5 h-5 text-amber-300" />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-amber-300/80">Loja de Moedas</p>
              <p className="text-lg font-black text-white">
                {selected ? "Pagamento via PIX" : "Escolha um pacote"}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-white/10 active:scale-95" aria-label="Fechar">
            <X className="w-5 h-5 text-white/70" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto scrollbar-none">
          {!selected ? (
            <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
              {packs.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setSelected(p)}
                  className="relative text-left p-5 rounded-2xl border border-white/10 bg-white/[0.03] hover:bg-white/[0.06] hover:border-amber-400/40 active:scale-[0.98] transition-all"
                >
                  {p.highlight && (
                    <span className="absolute -top-2 right-3 text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full bg-amber-400 text-black">
                      <Sparkles className="inline w-3 h-3 mr-1" />{p.highlight}
                    </span>
                  )}
                  <p className="text-[10px] font-black uppercase tracking-widest text-white/50">{p.name}</p>
                  <p className="text-3xl font-black text-amber-300 tabular-nums mt-1">
                    {p.coins.toLocaleString("pt-BR")} <span className="text-lg">🪙</span>
                  </p>
                  <p className="text-[10px] font-bold text-emerald-300 mt-1">{p.bonusLabel}</p>
                  <div className="mt-3 pt-3 border-t border-white/5 flex items-center justify-between">
                    <span className="text-white font-black text-lg">{formatBRL(p.priceBRL)}</span>
                    <span className="text-[10px] font-black uppercase tracking-widest text-amber-300">PIX</span>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="p-6 space-y-5">
              <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-white/50">{selected.name}</p>
                  <p className="text-xl font-black text-amber-300 tabular-nums">{selected.coins.toLocaleString("pt-BR")} 🪙</p>
                  <p className="text-[10px] font-bold text-emerald-300">{selected.bonusLabel}</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-black uppercase tracking-widest text-white/50">Total</p>
                  <p className="text-2xl font-black text-white">{formatBRL(selected.priceBRL)}</p>
                </div>
              </div>

              <div className="aspect-square max-w-[240px] mx-auto rounded-2xl border border-white/10 bg-white/95 flex items-center justify-center">
                <div className="text-center text-black/70">
                  <QrCode className="w-32 h-32 mx-auto" strokeWidth={1.2} />
                  <p className="text-[10px] font-black uppercase tracking-widest mt-1">QR PIX SIMULADO</p>
                </div>
              </div>

              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-white/50">PIX Copia e Cola</label>
                <div className="mt-1 flex gap-2">
                  <textarea
                    readOnly
                    value={buildPixPayload(selected)}
                    className="flex-1 bg-white/5 border border-white/10 rounded-xl p-2 text-[10px] font-mono text-white/70 h-16 resize-none scrollbar-none"
                  />
                  <button
                    onClick={handleCopy}
                    className="px-3 rounded-xl bg-amber-400 text-black font-black text-[10px] uppercase tracking-widest active:scale-95"
                  >
                    {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-2">
                <button
                  onClick={() => setSelected(null)}
                  className="flex-1 py-3 rounded-xl bg-white/5 border border-white/10 text-white/70 font-black uppercase tracking-widest text-[10px] hover:bg-white/10"
                >
                  Trocar Pacote
                </button>
                <button
                  onClick={handleConfirmPayment}
                  disabled={confirming}
                  className="flex-1 py-3 rounded-xl bg-emerald-400 text-black font-black uppercase tracking-tighter flex items-center justify-center gap-2 active:scale-95 disabled:opacity-60"
                >
                  {confirming ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  Confirmei o Pagamento
                </button>
              </div>
              <p className="text-[10px] text-white/40 text-center">
                Após a confirmação pelo gateway PIX o saldo é creditado automaticamente via webhook.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
