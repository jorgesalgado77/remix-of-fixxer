import { useNavigate } from "@tanstack/react-router";
import { ShoppingBag, ChevronRight, Cpu, Settings, Coins } from "lucide-react";

export function InfoAdminSection() {
  const navigate = useNavigate();

  return (
    <div className="bg-card/50 backdrop-blur-xl border border-white/10 p-8 rounded-[40px] space-y-6 group hover:border-primary/30 transition-all">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center text-primary group-hover:scale-110 transition-transform shadow-[0_0_20px_rgba(0,255,135,0.1)]">
            <ShoppingBag className="w-7 h-7" />
          </div>
          <div>
            <h3 className="text-xl font-black text-white italic uppercase tracking-tighter">Info Produtos</h3>
            <p className="text-sm text-muted-foreground uppercase tracking-widest font-bold text-[10px]">Gestão Global & IA</p>
          </div>
        </div>
        <button 
          onClick={() => navigate({ to: "/admin/infoprodutos" })}
          className="p-3 bg-white/5 rounded-2xl hover:bg-primary hover:text-primary-foreground transition-all group/btn shadow-xl border border-white/5"
        >
          <ChevronRight className="w-5 h-5 group-hover/btn:translate-x-1 transition-transform" />
        </button>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white/[0.03] border border-white/5 p-3 rounded-2xl text-center space-y-1">
          <Cpu className="w-4 h-4 text-primary mx-auto opacity-50" />
          <p className="text-[9px] font-black text-white/40 uppercase tracking-widest">IA Engine</p>
        </div>
        <div className="bg-white/[0.03] border border-white/5 p-3 rounded-2xl text-center space-y-1">
          <Settings className="w-4 h-4 text-blue-400 mx-auto opacity-50" />
          <p className="text-[9px] font-black text-white/40 uppercase tracking-widest">Config</p>
        </div>
        <div className="bg-white/[0.03] border border-white/5 p-3 rounded-2xl text-center space-y-1">
          <Coins className="w-4 h-4 text-amber-400 mx-auto opacity-50" />
          <p className="text-[9px] font-black text-white/40 uppercase tracking-widest">Taxas</p>
        </div>
      </div>
    </div>
  );
}
