import { ShieldCheck, Activity, Users, FileText, DollarSign } from "lucide-react";

export function AdminPage() {
  const metrics = [
    { label: "Usuários", value: "1.240", icon: Users },
    { label: "O.S. Ativas", value: "342", icon: FileText },
    { label: "Volume (R$)", value: "42.5k", icon: DollarSign },
    { label: "Status", value: "100%", icon: Activity },
  ];

  return (
    <div className="min-h-screen p-6 space-y-8">
      <header className="flex justify-between items-center">
        <div className="flex items-center gap-2">
          <ShieldCheck className="text-[#00FF87]" size={24} />
          <h1 className="text-xl font-black italic uppercase">Master Admin</h1>
        </div>
        <div className="w-8 h-8 bg-[#00FF87]/10 rounded-full border border-[#00FF87]/20 flex items-center justify-center">
          <div className="w-2 h-2 bg-[#00FF87] rounded-full animate-pulse" />
        </div>
      </header>

      <div className="grid grid-cols-2 gap-4">
        {metrics.map((m, i) => (
          <div key={i} className="card-neon p-5">
            <m.icon size={20} className="text-[#00FF87] mb-3" />
            <div className="text-2xl font-black">{m.value}</div>
            <div className="text-[10px] font-bold uppercase text-white/30">{m.label}</div>
          </div>
        ))}
      </div>

      <section className="space-y-4">
        <h3 className="text-xs font-black uppercase text-white/30 tracking-[0.2em] ml-1">Auditoria Recente</h3>
        <div className="space-y-2">
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-[#1A1A1B] p-4 rounded-xl border border-white/5 flex items-center justify-between">
              <div>
                <div className="text-sm font-bold">Loja Móveis XPTO</div>
                <div className="text-[10px] text-white/20 italic">Aprovado há 2h</div>
              </div>
              <div className="w-1.5 h-1.5 bg-[#00FF87] rounded-full" />
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
