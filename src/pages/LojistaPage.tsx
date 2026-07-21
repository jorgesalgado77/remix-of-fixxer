import { Package, Clock, ShieldCheck } from "lucide-react";

export function LojistaPage() {
  return (
    <div className="min-h-screen p-6 space-y-8">
      <h1 className="text-2xl font-black italic uppercase">Lojista</h1>
      
      <div className="card-neon bg-[#00FF87] text-black">
        <h3 className="font-black italic uppercase mb-1">Nova Solicitação</h3>
        <p className="text-black/60 text-xs mb-4">Envie uma nova ordem de montagem</p>
        <button className="w-full bg-black text-[#00FF87] font-black py-3 rounded-xl uppercase text-[10px] tracking-widest">
          Abrir O.S. Agora
        </button>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="card-neon p-4">
          <Clock size={20} className="text-[#00FF87] mb-2" />
          <div className="text-xl font-black">12</div>
          <div className="text-[10px] font-bold text-white/30 uppercase">Pendentes</div>
        </div>
        <div className="card-neon p-4">
          <ShieldCheck size={20} className="text-[#00FF87] mb-2" />
          <div className="text-xl font-black">45</div>
          <div className="text-[10px] font-bold text-white/30 uppercase">Garantias</div>
        </div>
      </div>
    </div>
  );
}
