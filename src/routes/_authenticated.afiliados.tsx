import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabaseExternal } from "@/lib/supabaseExternal";
import { buildReferralUrl, suggestAffiliateCode } from "@/lib/affiliates";
import { Copy, Users, TrendingUp, Wallet, Sparkles, Check, Share2, Percent, Link2, Download } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/afiliados")({
  component: AffiliatesPage,
  head: () => ({
    meta: [
      { title: "FIXXER — Programa de Afiliados" },
      { name: "description", content: "Indique lojistas e prestadores e ganhe comissões recorrentes na FIXXER." },
    ],
  }),
});

interface AffiliateProfile {
  user_id: string;
  code: string;
  commission_pct: number;
  active: boolean;
  total_earned: number;
  total_paid: number;
}

interface Commission {
  id: string;
  amount: number;
  status: "pending" | "available" | "paid";
  created_at: string;
  order_id: string;
}

interface Referral {
  id: string;
  referred_user_id: string;
  source: string;
  created_at: string;
}

function AffiliatesPage() {
  const [profile, setProfile] = useState<AffiliateProfile | null>(null);
  const [commissions, setCommissions] = useState<Commission[]>([]);
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingPct, setSavingPct] = useState(false);
  const [copied, setCopied] = useState(false);

  const referralUrl = useMemo(() => (profile ? buildReferralUrl(profile.code) : ""), [profile]);

  useEffect(() => {
    void loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const { data: { session } } = await supabaseExternal.auth.getSession();
      if (!session) {
        setLoading(false);
        return;
      }
      const userId = session.user.id;

      // 1. Perfil de afiliado (cria se não existir)
      let { data: aff } = await supabaseExternal
        .from("affiliate_profiles")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle();

      if (!aff) {
        const fullName = session.user.user_metadata?.full_name || session.user.email?.split("@")[0] || "afiliado";
        const suggestedCode = suggestAffiliateCode(fullName);
        const { data: created, error: createErr } = await supabaseExternal
          .from("affiliate_profiles")
          .insert({ user_id: userId, code: suggestedCode, commission_pct: 5.0, active: true })
          .select("*")
          .single();
        if (createErr) {
          toast.error("Erro ao criar perfil de afiliado: " + createErr.message);
          setLoading(false);
          return;
        }
        aff = created;
      }
      setProfile(aff as AffiliateProfile);

      // 2. Comissões
      const { data: com } = await supabaseExternal
        .from("affiliate_commissions")
        .select("*")
        .eq("affiliate_user_id", userId)
        .order("created_at", { ascending: false })
        .limit(50);
      setCommissions((com as Commission[]) || []);

      // 3. Indicações
      const { data: refs } = await supabaseExternal
        .from("affiliate_referrals")
        .select("*")
        .eq("affiliate_user_id", userId)
        .order("created_at", { ascending: false })
        .limit(50);
      setReferrals((refs as Referral[]) || []);
    } catch (e: any) {
      toast.error("Erro ao carregar dados: " + (e?.message || "desconhecido"));
    } finally {
      setLoading(false);
    }
  }

  async function updateCommissionPct(pct: number) {
    if (!profile) return;
    setSavingPct(true);
    const { error } = await supabaseExternal
      .from("affiliate_profiles")
      .update({ commission_pct: pct })
      .eq("user_id", profile.user_id);
    if (error) toast.error("Erro ao atualizar: " + error.message);
    else {
      setProfile({ ...profile, commission_pct: pct });
      toast.success("Comissão atualizada para " + pct.toFixed(1) + "%");
    }
    setSavingPct(false);
  }

  function copyUrl() {
    if (!referralUrl) return;
    navigator.clipboard.writeText(referralUrl);
    setCopied(true);
    toast.success("Link copiado!");
    setTimeout(() => setCopied(false), 2000);
  }

  async function shareUrl() {
    if (!referralUrl) return;
    if (navigator.share) {
      try {
        await navigator.share({
          title: "Junte-se ao FIXXER",
          text: "Faço parte da rede FIXXER — o hub de serviços para móveis sob medida.",
          url: referralUrl,
        });
      } catch {}
    } else {
      copyUrl();
    }
  }

  function exportCsv() {
    if (!profile) return;
    const brl = (n: number) => n.toFixed(2).replace(".", ",");
    const totalEarned = commissions.reduce((s, c) => s + Number(c.amount), 0);
    const lines: string[] = [];
    // Cabeçalho de métricas
    lines.push("Métrica;Valor");
    lines.push(`Código;${profile.code}`);
    lines.push(`Taxa Comissão (%);${profile.commission_pct.toFixed(1)}`);
    lines.push(`Indicações;${referrals.length}`);
    lines.push(`Total Ganho (R$);${brl(totalEarned)}`);
    lines.push(`Pendente (R$);${brl(totalPending)}`);
    lines.push(`Disponível (R$);${brl(totalAvailable)}`);
    lines.push(`Pago (R$);${brl(totalPaid)}`);
    lines.push("");
    // Histórico
    lines.push("ID Comissão;Data;O.S.;Valor (R$);Status");
    for (const c of commissions) {
      const dt = new Date(c.created_at).toLocaleString("pt-BR");
      const status = c.status === "paid" ? "Pago" : c.status === "available" ? "Disponível" : "Pendente";
      lines.push(`${c.id};${dt};${c.order_id};${brl(Number(c.amount))};${status}`);
    }
    const csv = "\uFEFF" + lines.join("\n"); // BOM para Excel PT-BR
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `fixxer-afiliados-${profile.code}-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success("CSV exportado!");
  }

  const totalPending = commissions.filter((c) => c.status === "pending").reduce((s, c) => s + Number(c.amount), 0);
  const totalAvailable = commissions.filter((c) => c.status === "available").reduce((s, c) => s + Number(c.amount), 0);
  const totalPaid = commissions.filter((c) => c.status === "paid").reduce((s, c) => s + Number(c.amount), 0);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-primary font-black uppercase text-xs tracking-widest">Carregando afiliados...</div>
      </div>
    );
  }

  if (!profile) return null;

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
        {/* HEADER */}
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-primary/10 border border-primary/30 flex items-center justify-center">
            <Sparkles className="w-7 h-7 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-black text-white uppercase italic tracking-tighter">Programa de Afiliados</h1>
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Indique. Comissione. Cresça.</p>
          </div>
        </div>

        {/* MÉTRICAS */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <MetricCard icon={<Users className="w-5 h-5" />} label="Indicações" value={referrals.length.toString()} accent="text-primary" />
          <MetricCard icon={<TrendingUp className="w-5 h-5" />} label="Pendente" value={"R$ " + totalPending.toFixed(2)} accent="text-amber-400" />
          <MetricCard icon={<Wallet className="w-5 h-5" />} label="Disponível" value={"R$ " + totalAvailable.toFixed(2)} accent="text-emerald-400" />
          <MetricCard icon={<Check className="w-5 h-5" />} label="Pago" value={"R$ " + totalPaid.toFixed(2)} accent="text-white/60" />
        </div>

        {/* LINK DE INDICAÇÃO */}
        <div className="bg-card/50 backdrop-blur-xl border border-white/10 rounded-3xl p-6 space-y-4">
          <div className="flex items-center gap-2">
            <Link2 className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-black uppercase tracking-tight text-white">Seu Link Único</h2>
          </div>
          <div className="flex items-stretch gap-2">
            <div className="flex-1 bg-black/30 border border-white/10 rounded-xl px-4 py-3 font-mono text-xs text-primary truncate">
              {referralUrl}
            </div>
            <button onClick={copyUrl} className="bg-primary text-black px-4 rounded-xl font-black uppercase text-xs hover:scale-[1.02] active:scale-95 transition-all flex items-center gap-1">
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            </button>
            <button onClick={shareUrl} className="bg-white/5 border border-white/10 text-white px-4 rounded-xl hover:bg-white/10 transition-all">
              <Share2 className="w-4 h-4" />
            </button>
          </div>
          <p className="text-[11px] text-muted-foreground">
            Compartilhe este link. Quando alguém se cadastrar por ele e fechar uma O.S. na plataforma, você recebe{" "}
            <span className="text-primary font-black">{profile.commission_pct.toFixed(1)}%</span> de comissão.
          </p>
        </div>

        {/* COMISSÃO CONFIGURÁVEL */}
        <div className="bg-card/50 backdrop-blur-xl border border-white/10 rounded-3xl p-6 space-y-4">
          <div className="flex items-center gap-2">
            <Percent className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-black uppercase tracking-tight text-white">Taxa de Comissão</h2>
          </div>
          <div className="flex items-center gap-4">
            <input
              type="range"
              min="3"
              max="15"
              step="0.5"
              value={profile.commission_pct}
              disabled={savingPct}
              onChange={(e) => setProfile({ ...profile, commission_pct: Number(e.target.value) })}
              onMouseUp={(e) => updateCommissionPct(Number((e.target as HTMLInputElement).value))}
              onTouchEnd={(e) => updateCommissionPct(Number((e.target as HTMLInputElement).value))}
              className="flex-1 accent-[hsl(var(--primary))]"
            />
            <div className="text-2xl font-black text-primary min-w-[80px] text-right">
              {profile.commission_pct.toFixed(1)}%
            </div>
          </div>
          <p className="text-[11px] text-muted-foreground">
            Entre 3% e 15%. Você pode ajustar a qualquer momento — novas indicações usarão a taxa atual.
          </p>
        </div>

        {/* HISTÓRICO DE COMISSÕES */}
        <div className="bg-card/50 backdrop-blur-xl border border-white/10 rounded-3xl p-6 space-y-4">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-lg font-black uppercase tracking-tight text-white">Comissões Recentes</h2>
            <button
              onClick={exportCsv}
              disabled={commissions.length === 0 && referrals.length === 0}
              className="flex items-center gap-1.5 bg-primary/10 border border-primary/30 text-primary px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-primary/20 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Download className="w-3.5 h-3.5" />
              Exportar CSV
            </button>
          </div>
          {commissions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Wallet className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p className="text-xs uppercase tracking-widest font-bold">Nenhuma comissão ainda</p>
            </div>
          ) : (
            <div className="space-y-2">
              {commissions.slice(0, 20).map((c) => (
                <div key={c.id} className="flex items-center justify-between bg-black/20 border border-white/5 rounded-xl px-4 py-3">
                  <div>
                    <div className="text-xs text-muted-foreground font-mono">O.S. #{c.order_id.slice(0, 8)}</div>
                    <div className="text-[10px] text-muted-foreground/60 uppercase">{new Date(c.created_at).toLocaleDateString("pt-BR")}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-primary font-black">R$ {Number(c.amount).toFixed(2)}</div>
                    <div className={`text-[9px] uppercase font-bold ${c.status === "paid" ? "text-white/40" : c.status === "available" ? "text-emerald-400" : "text-amber-400"}`}>
                      {c.status === "paid" ? "Pago" : c.status === "available" ? "Disponível" : "Pendente"}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function MetricCard({ icon, label, value, accent }: { icon: React.ReactNode; label: string; value: string; accent: string }) {
  return (
    <div className="bg-card/50 backdrop-blur-xl border border-white/10 rounded-2xl p-4 space-y-2">
      <div className={accent}>{icon}</div>
      <div className={`text-lg font-black ${accent}`}>{value}</div>
      <div className="text-[9px] uppercase tracking-widest font-bold text-muted-foreground">{label}</div>
    </div>
  );
}
