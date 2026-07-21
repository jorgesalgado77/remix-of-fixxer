import { CheckCircle2, Star } from "lucide-react";

export function ClientePage() {
  return (
    <div className="min-h-screen p-6 space-y-8">
      <h1 className="text-2xl font-black italic uppercase">Minha Montagem</h1>

      <div className="card-neon relative overflow-hidden">
        <div className="absolute top-0 left-0 w-1 bg-[#00FF87] h-full" />
        <div className="flex justify-between items-center mb-6">
          <div>
            <div className="text-[10px] font-black uppercase text-white/30 mb-1">Status do Pedido</div>
            <div className="font-bold text-[#00FF87] flex items-center gap-2">
              <CheckCircle2 size={16} /> Montador a caminho
            </div>
          </div>
          <div className="text-right">
            <div className="text-[10px] font-black uppercase text-white/30 mb-1">Previsão</div>
            <div className="font-bold">14:30</div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-white/5 rounded-full" />
            <div className="flex-1">
              <div className="text-sm font-bold">Ricardo Silva</div>
              <div className="flex text-[#00FF87]">
                {[1,2,3,4,5].map(i => <Star key={i} size={10} fill="currentColor" />)}
              </div>
            </div>
          </div>
          <button className="w-full bg-white/5 text-white/60 font-bold py-3 rounded-xl text-xs">
            Chat com Montador
          </button>
        </div>
      </div>
    </div>
  );
}
