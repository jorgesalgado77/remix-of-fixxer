import { useMemo, useState } from "react";
import { X, Crown, Check, Rocket, Calendar, Coins, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabaseExternal } from "@/lib/supabaseExternal";

import { type PlanId } from "@/lib/monetization";
import { useMonetization } from "@/hooks/use-monetization";

interface Props {
  currentPlan: PlanId;
  renewsAt?: string | null;
  onClose: () => void;
}

type Billing = "monthly" | "yearly";

function formatBRL(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function fmtDate(iso?: string | null) {
  if (!iso) return "—";
  try { return new Date(iso).toLocaleDateString("pt-BR"); } catch { return iso; }
}

const PLAN_BENEFITS: Record<PlanId, string[]> = {
  free:    ["Acesso ao Feed", "Criar perfil público", "Chat com contatos aceitos"],
  basico:  ["Publicar até 2 anúncios/mês", "Filtros básicos de oportunidade", "Suporte por e-mail"],
  pro:     ["Publicar até 5 anúncios/mês", "Selo Verificado Prata", "Push de novas oportunidades", "Analytics de visualizações"],
  premium: ["Anúncios ilimitados", "Selo Ouro + Destaque no Feed", "Prioridade em disputas", "Assessor dedicado"],
};

export function PlanDetailsModal({ currentPlan, renewsAt, onClose }: Props) {
  const cfg = useMonetization();
  const plans = useMemo(() => cfg.plans.filter((p) => p.enabled), [cfg]);
  const [billing, setBilling] = useState<Billing>("monthly");
  const [target, setTarget] = useState<PlanId>(currentPlan);
  const [processing, setProcessing] = useState(false);

  const currentCfg = useMemo(() => plans.find((p) => p.id === currentPlan) || plans[0], [plans, currentPlan]);
  const targetCfg  = useMemo(() => plans.find((p) => p.id === target) || currentCfg, [plans, target, currentCfg]);

  const handleUpgrade = async () => {
    if (!targetCfg) return;
    if (targetCfg.id === currentPlan) { toast.info("Você já está neste plano."); return; }
    setProcessing(true);
    
    try {
      // 1. Log da tentativa no histórico (Auditoria)
      const { data: { user } } = await supabaseExternal.auth.getUser();
      if (user) {
        await supabaseExternal.from('system_audit').insert({
          user_id: user.id,
          event_type: 'plan_upgrade',
          status: 'pending',
          description: \`Iniciada tentativa de upgrade para o plano \${targetCfg.name} (\${billing})\`,
          metadata: {
            plan_id: targetCfg.id,
            billing_cycle: billing,
            price: targetCfg.priceMonthlyBRL,
            currency: 'BRL',
            timestamp: new Date().toISOString()
          }
        });
      }

      // TODO: integrar checkout real (PIX mensal / Cartão 12x anual)
      setTimeout(async () => {
        setProcessing(false);
        toast.success(\`Upgrade para \${targetCfg.name} (\${billing === "monthly" ? "PIX Mensal" : "Cartão Anual 12x"}) iniciado!\`);
        
        // Simulação de sucesso no backend gravando resposta
        if (user) {
          await supabaseExternal.from('system_audit').insert({
            user_id: user.id,
            event_type: 'plan_upgrade',
            status: 'success',
            description: \`Upgrade para \${targetCfg.name} concluído com sucesso.\`,
            metadata: {
              plan_id: targetCfg.id,
              transaction_id: \`TX-\${Math.random().toString(36).slice(2, 10).toUpperCase()}\`,
              receipt_url: 'https://fixxer.app/receipts/demo',
              document_path: 'receipts/demo-receipt.pdf' // Simulação de path para download
            }
          });
        }
        
        onClose();
      }, 1500);
    } catch (e) {
      setProcessing(false);
      toast.error("Erro ao processar upgrade.");
    }
  };


  const price = targetCfg ? (billing === "monthly" ? targetCfg.priceMonthlyBRL : targetCfg.priceYearlyBRL) : 0;
  const monthlyEquivalent = billing === "yearly" && targetCfg ? targetCfg.priceYearlyBRL / 12 : null;

  return (
    <div className="fixed inset-0 z-[210] bg-black/95 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={onClose}>
      <div
        className="w-full sm:max-w-3xl bg-[#0a0a0b] border border-white/10 sm:rounded-3xl rounded-t-3xl shadow-2xl overflow-hidden flex flex-col relative isolate"
        style={{ maxHeight: "calc(100dvh - 20px)", height: "auto" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-5 border-b border-white/10 flex items-center justify-between bg-gradient-to-br from-amber-500/10 to-transparent">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-amber-400/15 border border-amber-400/30 flex items-center justify-center">
              <Crown className="w-5 h-5 text-amber-300" />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-amber-300/80">Seu Plano Atual</p>
              <p className="text-lg font-black text-white">{currentCfg?.name || "Free"}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-white/10 active:scale-95" aria-label="Fechar">
            <X className="w-5 h-5 text-white/70" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto scrollbar-none p-5 pb-8 space-y-6">
          {/* Resumo atual */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div className="p-3 rounded-2xl bg-white/[0.04] border border-white/10">
              <p className="text-[9px] font-black uppercase tracking-widest text-white/50">Franquia Mensal</p>
              <p className="text-lg font-black text-amber-300 flex items-center gap-1"><Coins className="w-4 h-4" />{currentCfg?.coinsMonthly ?? 0}</p>
            </div>
            <div className="p-3 rounded-2xl bg-white/[0.04] border border-white/10">
              <p className="text-[9px] font-black uppercase tracking-widest text-white/50">Anúncios/Mês</p>
              <p className="text-lg font-black text-white">{currentCfg?.freeAdsMonthly ?? 0}</p>
            </div>
            <div className="p-3 rounded-2xl bg-white/[0.04] border border-white/10 col-span-2 sm:col-span-1">
              <p className="text-[9px] font-black uppercase tracking-widest text-white/50">Renovação</p>
              <p className="text-sm font-black text-white flex items-center gap-1"><Calendar className="w-4 h-4" />{fmtDate(renewsAt)}</p>
            </div>
          </div>

          {/* Tabela comparativa */}
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-white/50 mb-2">Escolha o novo plano</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {plans.map((p) => {
                const active = target === p.id;
                const isCurrent = currentPlan === p.id;
                return (
                  <button
                    key={p.id}
                    onClick={() => setTarget(p.id)}
                    className={
                      "text-left p-4 rounded-2xl border transition-all " +
                      (active ? "border-amber-400 bg-amber-400/10 ring-2 ring-amber-400/40"
                              : "border-white/10 bg-white/[0.03] hover:bg-white/[0.06]")
                    }
                  >
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-[10px] font-black uppercase tracking-widest text-white/70">{p.name}</p>
                      {isCurrent && <span className="text-[8px] font-black uppercase tracking-widest text-emerald-300">Atual</span>}
                    </div>
                    <p className="text-xl font-black text-white">{p.priceMonthlyBRL === 0 ? "Grátis" : formatBRL(p.priceMonthlyBRL)}<span className="text-[10px] text-white/40">/mês</span></p>
                    <p className="text-[10px] font-bold text-amber-300 mt-1">{p.coinsMonthly} 🪙/mês</p>
                    <ul className="mt-3 space-y-1">
                      {(PLAN_BENEFITS[p.id] || []).map((b) => (
                        <li key={b} className="text-[11px] text-white/70 flex items-start gap-1.5">
                          <Check className="w-3 h-3 text-emerald-300 shrink-0 mt-0.5" />{b}
                        </li>
                      ))}
                    </ul>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Billing toggle */}
          {targetCfg && targetCfg.id !== "free" && (
            <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10">
              <p className="text-[10px] font-black uppercase tracking-widest text-white/50 mb-2">Forma de pagamento</p>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setBilling("monthly")}
                  className={"p-3 rounded-xl border text-left transition-all " + (billing === "monthly" ? "border-amber-400 bg-amber-400/10" : "border-white/10 bg-white/[0.02]")}
                >
                  <p className="text-[10px] font-black uppercase tracking-widest text-white/60">Mensal · PIX</p>
                  <p className="text-lg font-black text-white">{formatBRL(targetCfg.priceMonthlyBRL)}<span className="text-[10px] text-white/40">/mês</span></p>
                </button>
                <button
                  onClick={() => setBilling("yearly")}
                  className={"p-3 rounded-xl border text-left transition-all relative " + (billing === "yearly" ? "border-amber-400 bg-amber-400/10" : "border-white/10 bg-white/[0.02]")}
                >
                  <span className="absolute -top-2 right-2 text-[8px] font-black uppercase tracking-widest bg-emerald-400 text-black px-2 py-0.5 rounded-full">-20%</span>
                  <p className="text-[10px] font-black uppercase tracking-widest text-white/60">Anual · Cartão 12x</p>
                  <p className="text-lg font-black text-white">{formatBRL(targetCfg.priceYearlyBRL)}<span className="text-[10px] text-white/40">/ano</span></p>
                  {monthlyEquivalent && <p className="text-[10px] text-emerald-300 font-bold">≈ {formatBRL(monthlyEquivalent)}/mês</p>}
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="p-4 sm:p-5 border-t border-white/10 bg-[#0a0a0b] sticky bottom-0 z-20 shadow-[0_-10px_30px_rgba(0,0,0,0.8)]">
          <button
            onClick={handleUpgrade}
            disabled={processing || !targetCfg || targetCfg.id === currentPlan}
            className="w-full bg-gradient-to-r from-amber-400 to-orange-500 text-black font-black uppercase tracking-tighter px-5 py-4 rounded-2xl flex items-center justify-center gap-2 shadow-[0_0_25px_rgba(251,191,36,0.35)] active:scale-95 transition-all disabled:opacity-50"
          >
            {processing ? <Loader2 className="w-5 h-5 animate-spin" /> : <Rocket className="w-5 h-5" />}
            {targetCfg?.id === currentPlan
              ? "Você já está neste plano"
              : `Fazer upgrade para ${targetCfg?.name} · ${formatBRL(price)}`}
          </button>
        </div>
      </div>
    </div>
  );
}
