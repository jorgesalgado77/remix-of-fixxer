import { useEffect, useState, useMemo } from "react";
import { X, Coins, ArrowDownLeft, ArrowUpRight, Zap, Loader2 } from "lucide-react";
import { supabaseExternal as supabase } from "@/lib/supabaseExternal";
import { fetchTransactions, subscribeBalance, type CoinTransaction } from "@/lib/coins";
import { CoinPacksStoreModal } from "@/components/CoinPacksStoreModal";

interface Props { onClose: () => void }

type Filter = "all" | "in" | "out";

function fmtDate(iso: string) {
  try {
    const d = new Date(iso);
    return d.toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "2-digit", hour: "2-digit", minute: "2-digit" });
  } catch { return iso; }
}

export function CoinsExtractModal({ onClose }: Props) {
  const [loading, setLoading] = useState(true);
  const [txs, setTxs] = useState<CoinTransaction[]>([]);
  const [filter, setFilter] = useState<Filter>("all");
  const [balance, setBalance] = useState(0);
  const [storeOpen, setStoreOpen] = useState(false);

  useEffect(() => subscribeBalance(setBalance), []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }
      const list = await fetchTransactions(user.id, 150);
      if (!cancelled) { setTxs(list); setLoading(false); }
    })();

    const onTx = (e: any) => {
      const tx = e?.detail as CoinTransaction | undefined;
      if (tx) setTxs((prev) => [tx, ...prev].slice(0, 200));
    };
    window.addEventListener("fixxer:coin-tx", onTx);
    return () => { cancelled = true; window.removeEventListener("fixxer:coin-tx", onTx); };
  }, []);

  const filtered = useMemo(() => {
    if (filter === "in")  return txs.filter((t) => t.type === "credit");
    if (filter === "out") return txs.filter((t) => t.type === "debit");
    return txs;
  }, [txs, filter]);

  return (
    <>
      <div
        className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-md flex items-end sm:items-center justify-center"
        onClick={onClose}
      >
        <div
          className="w-full sm:max-w-lg bg-[#141416] border border-white/10 sm:rounded-3xl rounded-t-3xl shadow-2xl overflow-hidden flex flex-col"
          style={{ maxHeight: "100dvh", height: "min(100dvh, 720px)" }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="p-5 border-b border-white/10 flex items-center justify-between bg-gradient-to-br from-amber-500/10 to-transparent">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-amber-400/15 border border-amber-400/30 flex items-center justify-center">
                <Coins className="w-5 h-5 text-amber-300" />
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-amber-300/80">Saldo Atual</p>
                <p className="text-2xl font-black text-white tabular-nums">
                  {balance.toLocaleString("pt-BR")} <span className="text-amber-300 text-base">🪙</span>
                </p>
              </div>
            </div>
            <button onClick={onClose} className="p-2 rounded-xl hover:bg-white/10 active:scale-95 transition-all" aria-label="Fechar">
              <X className="w-5 h-5 text-white/70" />
            </button>
          </div>

          {/* Filtros */}
          <div className="p-3 border-b border-white/10 flex gap-2 overflow-x-auto scrollbar-none">
            {([
              { id: "all", label: "Tudo" },
              { id: "in",  label: "Entradas / Compras" },
              { id: "out", label: "Saídas / Consumo" },
            ] as { id: Filter; label: string }[]).map((f) => (
              <button
                key={f.id}
                onClick={() => setFilter(f.id)}
                className={
                  "px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest whitespace-nowrap transition-all " +
                  (filter === f.id
                    ? "bg-amber-400 text-black"
                    : "bg-white/5 text-white/60 border border-white/10 hover:bg-white/10")
                }
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* Lista */}
          <div className="flex-1 overflow-y-auto overscroll-contain scrollbar-none">
            {loading ? (
              <div className="p-10 flex flex-col items-center gap-3 text-white/50">
                <Loader2 className="w-6 h-6 animate-spin" />
                <p className="text-[10px] font-black uppercase tracking-widest">Carregando extrato…</p>
              </div>
            ) : filtered.length === 0 ? (
              <div className="p-10 text-center text-white/50">
                <Coins className="w-8 h-8 mx-auto opacity-40 mb-3" />
                <p className="text-sm font-bold">Nenhuma transação encontrada.</p>
                <p className="text-[11px] mt-1 opacity-70">Compre um pacote de moedas para começar.</p>
              </div>
            ) : (
              <ul className="divide-y divide-white/5">
                {filtered.map((t) => {
                  const credit = t.type === "credit";
                  return (
                    <li key={t.id} className="p-4 flex items-center gap-3 hover:bg-white/[0.02]">
                      <div className={
                        "w-10 h-10 rounded-xl border flex items-center justify-center shrink-0 " +
                        (credit ? "bg-emerald-400/10 border-emerald-400/30 text-emerald-300"
                                : "bg-rose-400/10 border-rose-400/30 text-rose-300")
                      }>
                        {credit ? <ArrowDownLeft className="w-5 h-5" /> : <ArrowUpRight className="w-5 h-5" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-white truncate">{t.description || (credit ? "Crédito" : "Consumo")}</p>
                        <p className="text-[10px] uppercase tracking-widest text-white/40 font-black">{fmtDate(t.created_at)}</p>
                      </div>
                      <p className={"font-black tabular-nums text-sm " + (credit ? "text-emerald-300" : "text-rose-300")}>
                        {credit ? "+" : "-"}{t.amount.toLocaleString("pt-BR")} 🪙
                      </p>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          {/* Rodapé fixo */}
          <div className="p-4 border-t border-white/10 bg-[#0f0f11]">
            <button
              onClick={() => setStoreOpen(true)}
              className="w-full bg-gradient-to-r from-amber-400 to-orange-500 text-black font-black uppercase tracking-tighter px-5 py-4 rounded-2xl flex items-center justify-center gap-2 shadow-[0_0_25px_rgba(251,191,36,0.35)] active:scale-95 transition-all"
            >
              <Zap className="w-5 h-5" />
              Comprar Mais Moedas
            </button>
          </div>
        </div>
      </div>

      {storeOpen && <CoinPacksStoreModal onClose={() => setStoreOpen(false)} />}
    </>
  );
}
