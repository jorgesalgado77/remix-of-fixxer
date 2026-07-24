/**
 * FIXXER — Ponte global de feedback de moedas.
 * Escuta os eventos disparados por `spendCoinsForAction`:
 *   - `fixxer:insufficient-coins` -> aviso claro + CTA para comprar pacotes
 *   - `fixxer:coin-receipt`       -> comprovante (valor debitado + saldo restante)
 *
 * Também expõe atalho para o Extrato completo.
 */
import { useEffect, useState, lazy, Suspense } from "react";
import { toast } from "sonner";
import { AlertTriangle, CheckCircle2, Coins, Receipt, ShoppingBag, X } from "lucide-react";

const CoinsExtractModal   = lazy(() => import("./CoinsExtractModal").then((m) => ({ default: m.CoinsExtractModal })));
const CoinPacksStoreModal = lazy(() => import("./CoinPacksStoreModal").then((m) => ({ default: m.CoinPacksStoreModal })));

type Receipt = {
  actionKey: string;
  actionLabel: string;
  amount: number;
  balance: number;
  reference: string | null;
  at: string;
};

type Insufficient = {
  actionKey: string;
  actionLabel: string;
  cost: number;
  balance: number;
  shortfall: number;
};

export function CoinFeedbackBridge() {
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [insufficient, setInsufficient] = useState<Insufficient | null>(null);
  const [extractOpen, setExtractOpen] = useState(false);
  const [packsOpen, setPacksOpen] = useState(false);

  useEffect(() => {
    const onReceipt = (e: Event) => {
      const d = (e as CustomEvent<Receipt>).detail;
      setReceipt(d);
      toast.success(`−${d.amount} moedas · ${d.actionLabel}`, {
        description: `Saldo restante: ${d.balance} moedas`,
      });
    };
    const onInsufficient = (e: Event) => {
      const d = (e as CustomEvent<Insufficient>).detail;
      setInsufficient(d);
      toast.error(`Saldo insuficiente para "${d.actionLabel}"`, {
        description: `Faltam ${d.shortfall} moedas (custo ${d.cost} · saldo ${d.balance}).`,
      });
    };
    window.addEventListener("fixxer:insufficient-coins", onInsufficient as EventListener);
    window.addEventListener("fixxer:coin-receipt", onReceipt as EventListener);
    return () => {
      window.removeEventListener("fixxer:insufficient-coins", onInsufficient as EventListener);
      window.removeEventListener("fixxer:coin-receipt", onReceipt as EventListener);
    };
  }, []);

  return (
    <>
      {/* COMPROVANTE */}
      {receipt && (
        <div className="fixed inset-0 z-[10050] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
             onClick={() => setReceipt(null)}>
          <div className="w-full max-w-sm bg-[#0F0F10] border border-primary/30 rounded-3xl p-6 shadow-2xl"
               onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2 text-primary">
                <CheckCircle2 className="w-5 h-5" />
                <span className="text-[10px] font-black uppercase tracking-widest">Comprovante</span>
              </div>
              <button onClick={() => setReceipt(null)} className="text-white/40 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="mt-4 space-y-1">
              <h3 className="text-base font-black text-white">{receipt.actionLabel}</h3>
              <p className="text-[11px] text-white/50">
                {new Date(receipt.at).toLocaleString("pt-BR")}
                {receipt.reference ? ` · ${receipt.reference}` : ""}
              </p>
            </div>
            <div className="mt-5 rounded-2xl bg-white/5 border border-white/10 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] uppercase tracking-widest text-white/50">Valor debitado</span>
                <span className="text-lg font-black text-red-400">−{receipt.amount}</span>
              </div>
              <div className="flex items-center justify-between border-t border-white/5 pt-3">
                <span className="text-[10px] uppercase tracking-widest text-white/50">Saldo restante</span>
                <span className="text-lg font-black text-primary flex items-center gap-1">
                  <Coins className="w-4 h-4" /> {receipt.balance}
                </span>
              </div>
            </div>
            <div className="mt-5 grid grid-cols-2 gap-2">
              <button
                onClick={() => { setReceipt(null); setExtractOpen(true); }}
                className="flex items-center justify-center gap-2 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-white text-[11px] font-black uppercase"
              >
                <Receipt className="w-4 h-4" /> Ver Extrato
              </button>
              <button
                onClick={() => setReceipt(null)}
                className="py-3 rounded-xl bg-primary text-black text-[11px] font-black uppercase hover:bg-primary/90"
              >
                Ok
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SALDO INSUFICIENTE */}
      {insufficient && (
        <div className="fixed inset-0 z-[10050] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
             onClick={() => setInsufficient(null)}>
          <div className="w-full max-w-sm bg-[#0F0F10] border border-amber-400/40 rounded-3xl p-6 shadow-2xl"
               onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2 text-amber-400">
                <AlertTriangle className="w-5 h-5" />
                <span className="text-[10px] font-black uppercase tracking-widest">Saldo Insuficiente</span>
              </div>
              <button onClick={() => setInsufficient(null)} className="text-white/40 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="mt-4">
              <h3 className="text-base font-black text-white">{insufficient.actionLabel}</h3>
              <p className="text-[12px] text-white/60 mt-2 leading-relaxed">
                Esta ação custa <b className="text-white">{insufficient.cost} moedas</b>.
                Seu saldo atual é <b className="text-white">{insufficient.balance}</b>.
                Faltam <b className="text-amber-400">{insufficient.shortfall}</b> moedas.
              </p>
            </div>
            <div className="mt-5 grid grid-cols-2 gap-2">
              <button
                onClick={() => setInsufficient(null)}
                className="py-3 rounded-xl bg-white/5 hover:bg-white/10 text-white text-[11px] font-black uppercase"
              >
                Depois
              </button>
              <button
                onClick={() => { setInsufficient(null); setPacksOpen(true); }}
                className="flex items-center justify-center gap-2 py-3 rounded-xl bg-amber-400 text-black text-[11px] font-black uppercase hover:bg-amber-300"
              >
                <ShoppingBag className="w-4 h-4" /> Comprar Moedas
              </button>
            </div>
          </div>
        </div>
      )}

      {(extractOpen || packsOpen) && (
        <Suspense fallback={null}>
          {extractOpen && <CoinsExtractModal onClose={() => setExtractOpen(false)} />}
          {packsOpen   && <CoinPacksStoreModal onClose={() => setPacksOpen(false)} />}
        </Suspense>
      )}
    </>
  );
}
