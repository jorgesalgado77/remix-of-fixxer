import { useState, useEffect } from "react";
import { DollarSign, Save, Info, AlertTriangle, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  fetchMonetizationConfig, 
  saveMonetizationConfig, 
  MonetizationConfig, 
  getCachedMonetization 
} from "@/lib/monetization";
import { Link } from "@tanstack/react-router";

export function AdminMonetizationSettings() {
  const [cfg, setCfg] = useState<MonetizationConfig | null>(null);
  const [fee, setFee] = useState<string>("15");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const load = async () => {
      const data = await fetchMonetizationConfig();
      setCfg(data);
      setFee(String(data.pixPlatformFeePercent));
    };
    load();
  }, []);

  const handleSave = async () => {
    if (!cfg) return;
    const feeNum = parseFloat(fee);
    if (isNaN(feeNum) || feeNum < 0 || feeNum > 100) {
      toast.error("Taxa inválida. Use um valor entre 0 e 100.");
      return;
    }

    setSaving(true);
    const nextCfg: MonetizationConfig = {
      ...cfg,
      pixPlatformFeePercent: feeNum
    };

    const res = await saveMonetizationConfig(nextCfg);
    setSaving(false);

    if (res.ok) {
      toast.success("Configurações de monetização salvas!");
      setCfg(nextCfg);
    } else {
      toast.error(`Erro ao salvar: ${res.error}`);
    }
  };

  if (!cfg) return <div className="p-8 text-center text-white/50 animate-pulse uppercase text-[10px] font-black tracking-widest">Carregando...</div>;

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex items-center gap-4">
        <Link to="/admin" className="p-2 rounded-xl bg-white/5 border border-white/10 text-white/50 hover:text-white hover:bg-white/10 transition-all">
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <h2 className="text-xl font-black text-white tracking-tighter uppercase italic">Configurações de Monetização</h2>
          <p className="text-[10px] text-white/40 font-black uppercase tracking-widest">Controle global de taxas e precificação</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="p-6 rounded-3xl bg-white/[0.03] border border-white/5 space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <h3 className="text-sm font-black text-white uppercase italic">Taxa de Intermediação PIX</h3>
              <p className="text-[9px] text-white/30 font-bold uppercase tracking-widest">Cobrada sobre todos os recebimentos PIX</p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-[10px] font-black uppercase text-white/40 tracking-widest mb-2 block">Porcentagem da Taxa (%)</label>
              <div className="relative">
                <Input
                  type="number"
                  value={fee}
                  onChange={(e) => setFee(e.target.value)}
                  className="bg-black/40 border-white/10 rounded-2xl h-12 pl-4 pr-12 text-white font-black italic"
                  min="0"
                  max="100"
                  step="0.5"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-white/40 font-black">%</span>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-start gap-3">
              <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
              <p className="text-[10px] text-amber-200/70 font-medium">
                Esta taxa é aplicada automaticamente no momento da geração do QR Code e refletida nos extratos dos usuários. 
                <span className="block mt-1 font-bold text-amber-400 uppercase">Valor padrão sugerido: 15%.</span>
              </p>
            </div>

            <Button 
              onClick={handleSave}
              disabled={saving}
              className="w-full bg-[#00FF87] hover:bg-[#00D16E] text-black font-black uppercase italic tracking-widest rounded-2xl h-12 transition-all shadow-[0_0_20px_rgba(0,255,135,0.2)]"
            >
              {saving ? "Salvando..." : "Salvar Configurações"}
            </Button>
          </div>
        </div>

        <div className="p-6 rounded-3xl bg-white/[0.03] border border-white/5 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-500/20 border border-blue-500/30 flex items-center justify-center">
              <Info className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <h3 className="text-sm font-black text-white uppercase italic">Resumo de Planos</h3>
              <p className="text-[9px] text-white/30 font-bold uppercase tracking-widest">Visualização rápida da estrutura atual</p>
            </div>
          </div>
          
          <div className="space-y-2">
            {cfg.plans.map(p => (
              <div key={p.id} className="p-3 rounded-xl bg-white/5 border border-white/5 flex items-center justify-between">
                <span className="text-[10px] font-black text-white uppercase italic">{p.name}</span>
                <span className="text-[10px] font-black text-blue-400">R$ {p.priceMonthlyBRL.toFixed(2)}/mês</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
