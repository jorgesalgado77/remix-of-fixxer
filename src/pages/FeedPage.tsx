import { Search, Plus, Filter } from "lucide-react";

export function FeedPage() {
  return (
    <div className="min-h-screen pb-20">
      <header className="p-6 sticky top-0 bg-[#0A0A0B]/80 backdrop-blur-lg z-10 border-b border-white/5">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-black italic uppercase">Feed O.S.</h1>
          <button className="bg-[#00FF87] p-2 rounded-xl text-black">
            <Plus size={20} strokeWidth={3} />
          </button>
        </div>
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20" size={16} />
            <input className="input-fixxer pl-11 py-3" placeholder="Buscar serviços..." />
          </div>
          <button className="bg-[#1A1A1B] px-4 rounded-xl border border-white/10">
            <Filter size={18} className="text-white/40" />
          </button>
        </div>
      </header>

      <main className="p-6 space-y-4">
        {[1, 2, 3].map(i => (
          <div key={i} className="card-neon">
            <div className="flex justify-between items-start mb-4">
              <span className="text-[10px] font-black uppercase bg-[#00FF87]/10 text-[#00FF87] px-2 py-1 rounded">Pendente</span>
              <span className="text-white/20 text-[10px] font-bold italic">OS #29384</span>
            </div>
            <h3 className="font-bold text-lg mb-1">Montagem Cozinha Planejada</h3>
            <p className="text-white/40 text-xs mb-4">Bairro Jardins, São Paulo/SP</p>
            <div className="flex justify-between items-center pt-4 border-t border-white/5">
              <span className="text-sm font-black">R$ 450,00</span>
              <button className="text-[10px] font-black uppercase text-[#00FF87]">Ver Detalhes</button>
            </div>
          </div>
        ))}
      </main>
    </div>
  );
}
