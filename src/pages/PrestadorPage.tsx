import { MapPin, CheckCircle2, Wallet } from "lucide-react";

export function PrestadorPage() {
  return (
    <div className="min-h-screen p-6 space-y-8">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-black italic uppercase">Prestador</h1>
        <div className="flex items-center gap-2 bg-[#1A1A1B] px-3 py-1 rounded-full border border-white/10">
          <Wallet size={14} className="text-[#00FF87]" />
          <span className="text-xs font-black">R$ 1.420</span>
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="text-xs font-black uppercase text-white/30 tracking-[0.2em]">Disponíveis para Aceite</h3>
        {[1, 2].map(i => (
          <div key={i} className="card-neon border-l-4 border-l-[#00FF87]">
            <div className="flex justify-between mb-2">
              <h4 className="font-bold">Instalação de Painel TV</h4>
              <span className="text-[#00FF87] font-black">R$ 180</span>
            </div>
            <div className="flex items-center gap-2 text-white/40 text-[10px] mb-4">
              <MapPin size={10} /> 2.4 km de distância
            </div>
            <button className="w-full btn-primary py-3">Aceitar Serviço</button>
          </div>
        ))}
      </div>
    </div>
  );
}
