import { ShieldCheck, Star, Award, Zap } from "lucide-react";

export function GoldMedalBadge() {
  return (
    <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-gradient-to-r from-amber-500/20 to-yellow-500/10 border border-amber-500/30 shadow-[0_0_15px_rgba(245,158,11,0.15)] animate-pulse-slow">
      <div className="relative">
        <Award className="w-3.5 h-3.5 text-amber-500" />
        <Star className="w-1.5 h-1.5 text-white fill-current absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
      </div>
      <span className="text-[8px] font-black text-amber-500 uppercase italic tracking-tighter">
        Selo Ouro FIXXER
      </span>
      <div className="flex items-center -space-x-1 ml-1">
        {[1, 2, 3, 4, 5].map((i) => (
          <Star key={i} className="w-1.5 h-1.5 text-amber-500 fill-current opacity-70" />
        ))}
      </div>
    </div>
  );
}
