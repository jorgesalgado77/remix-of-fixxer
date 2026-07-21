import { Layers, Box } from "lucide-react";

export function ParceiroPage() {
  return (
    <div className="min-h-screen p-6 space-y-8">
      <h1 className="text-2xl font-black italic uppercase">Fornecedor</h1>
      
      <div className="grid grid-cols-1 gap-4">
        {[1, 2, 3].map(i => (
          <div key={i} className="card-neon flex gap-4 items-center">
            <div className="w-16 h-16 bg-[#0A0A0B] rounded-xl flex items-center justify-center">
              <Box size={24} className="text-white/20" />
            </div>
            <div className="flex-1">
              <div className="text-sm font-bold">Kit Ferragens Luxo</div>
              <div className="text-[10px] text-white/40 mb-2">Em estoque: 42 unidades</div>
              <div className="text-[#00FF87] font-black">R$ 89,90</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
