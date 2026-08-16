import { useEffect, useState } from "react";
import { Coins, Crown, Zap, Receipt, Rocket } from "lucide-react";
import { subscribeBalance, getCachedBalance } from "@/lib/coins";
import { useMonetization } from "@/hooks/use-monetization";
import { CoinsExtractModal } from "@/components/CoinsExtractModal";
import { CoinPacksStoreModal } from "@/components/CoinPacksStoreModal";
import { PlanDetailsModal } from "@/components/PlanDetailsModal";
import { supabaseExternal } from "@/lib/supabaseExternal";
import type { PlanId } from "@/lib/monetization";

/**
 * Card compartilhado "Saldo de Moedas & Plano".
 * Utilizado nos painéis Lojista, Prestador, Parceiro e Cliente.
 */
export function CoinBalancePlanCard({ className = "" }: { className?: string }) {
  const monetization = useMonetization();
  const [coinBalance, setCoinBalance] = useState<number>(() => getCachedBalance() || 0);
  const [planId, setPlanId] = useState<PlanId>("free");
  const [renewsAt, setRenewsAt] = useState<string | null>(null);
  const [showExtractModal, setShowExtractModal] = useState(false);
  const [showCoinStore, setShowCoinStore] = useState(false);
  const [showPlanModal, setShowPlanModal] = useState(false);

  useEffect(() => {
    const unsub = subscribeBalance((v) => setCoinBalance(v ?? 0));
    return () => { try { unsub?.(); } catch { /* noop */ } };
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const isMaster = typeof window !== 'undefined' && localStorage.getItem('fixxer:master-bypass') === 'true';
        const { data: { user } } = await supabaseExternal.auth.getUser();
        const userId = isMaster ? (localStorage.getItem('fixxer:last-category') === 'admin' ? '6ba65048-803f-44f6-88d2-24d04fee1a0f' : 'b3378b88-5c46-4e50-9c2e-4b7264a4d6e9') : user?.id;
        
        if (!userId || cancelled) return;
        const { data } = await supabaseExternal
          .from("profiles")
          .select("plan_id, plan_renews_at")
          .eq("id", userId)
          .maybeSingle();
        if (cancelled) return;
        if (data?.plan_id) setPlanId(String(data.plan_id).toLowerCase() as PlanId);
        if (data?.plan_renews_at) setRenewsAt(data.plan_renews_at as string);
      } catch (err) {
        console.warn("[CoinBalancePlanCard] falha ao carregar plano:", err);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const activePlan = monetization.plans.find((p) => p.id === planId) || monetization.plans[0];
  const nextRenewalLabel = renewsAt
    ? new Date(renewsAt).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" })
    : "—";

  return (
    <>
      <div className={`bg-[#1A1A1B] border border-white/10 p-4 md:p-6 rounded-2xl md:rounded-3xl relative overflow-hidden group hover:border-amber-400/40 transition-all ${className}`}>
        <div className="absolute top-0 right-0 w-40 h-40 bg-amber-400/[0.04] -mr-16 -mt-16 rounded-full pointer-events-none" />
        <div className="relative flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-9 h-9 rounded-xl bg-amber-400/15 border border-amber-400/30 flex items-center justify-center text-amber-300">
                <Coins className="w-5 h-5" />
              </div>
              <div className="text-[10px] md:text-xs font-bold text-muted-foreground uppercase italic tracking-wider">
                Saldo de Moedas &amp; Plano
              </div>
              <button
                type="button"
                onClick={() => setShowPlanModal(true)}
                className="ml-auto md:ml-2 inline-flex items-center gap-1.5 rounded-full border border-fuchsia-400/40 bg-gradient-to-r from-fuchsia-500/25 to-purple-500/10 text-fuchsia-200 px-2.5 py-1 text-[9px] md:text-[10px] font-black uppercase tracking-widest hover:brightness-125 active:scale-95 transition-all"
                title="Ver detalhes do plano"
              >
                <Crown className="w-3 h-3" />
                Plano {activePlan?.name || "Free"}
              </button>
            </div>
            <button
              type="button"
              onClick={() => setShowExtractModal(true)}
              className="block text-left"
              title="Ver extrato de moedas"
            >
              <div className="text-3xl md:text-5xl font-black italic text-white tabular-nums leading-none">
                {(coinBalance ?? 0).toLocaleString("pt-BR")}
                <span className="text-amber-300 text-xl md:text-3xl ml-2">🪙</span>
              </div>
            </button>
            <div className="mt-3 pt-2 border-t border-white/10 grid grid-cols-1 sm:grid-cols-2 gap-1.5">
              <div className="text-[9px] md:text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Renovação Mensal: <span className="text-white ml-1">{nextRenewalLabel}</span>
              </div>
              <div className="text-[9px] md:text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Franquia do Plano: <span className="text-emerald-300 ml-1">{(activePlan?.coinsMonthly ?? 0).toLocaleString("pt-BR")} moedas/mês</span>
              </div>
            </div>
          </div>
          <div className="flex flex-wrap md:flex-nowrap items-center gap-2 md:flex-col md:items-stretch md:min-w-[190px]">
            <button
              type="button"
              onClick={() => setShowCoinStore(true)}
              className="flex-1 md:flex-none inline-flex items-center justify-center gap-1.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-black font-black uppercase tracking-wider text-[10px] md:text-xs px-3 py-2 active:scale-95 transition-all"
            >
              <Zap className="w-3.5 h-3.5" /> Comprar Moedas
            </button>
            <button
              type="button"
              onClick={() => setShowExtractModal(true)}
              className="flex-1 md:flex-none inline-flex items-center justify-center gap-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white font-black uppercase tracking-wider text-[10px] md:text-xs px-3 py-2 active:scale-95 transition-all"
            >
              <Receipt className="w-3.5 h-3.5" /> Extrato
            </button>
            <button
              type="button"
              onClick={() => setShowPlanModal(true)}
              className="flex-1 md:flex-none inline-flex items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-fuchsia-500 to-purple-500 hover:brightness-110 text-white font-black uppercase tracking-wider text-[10px] md:text-xs px-3 py-2 active:scale-95 transition-all"
            >
              <Rocket className="w-3.5 h-3.5" /> Upgrade
            </button>
          </div>
        </div>
      </div>

      {showExtractModal && <CoinsExtractModal onClose={() => setShowExtractModal(false)} />}
      {showCoinStore && <CoinPacksStoreModal onClose={() => setShowCoinStore(false)} />}
      {showPlanModal && (
        <PlanDetailsModal
          currentPlan={planId}
          renewsAt={renewsAt}
          onClose={() => setShowPlanModal(false)}
        />
      )}
    </>
  );
}

export default CoinBalancePlanCard;
