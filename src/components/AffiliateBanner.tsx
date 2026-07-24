import { Link } from "@tanstack/react-router";
import { Sparkles, ArrowRight } from "lucide-react";

export function AffiliateBanner() {
  return (
    <Link
      to={"/afiliados" as any}
      className="block bg-gradient-to-r from-primary/20 via-primary/10 to-transparent border border-primary/30 rounded-2xl p-4 hover:border-primary/60 transition-all group"
    >
      <div className="flex items-center gap-3">
        <div className="w-11 h-11 rounded-xl bg-primary/20 flex items-center justify-center shrink-0">
          <Sparkles className="w-5 h-5 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-xs font-black text-primary uppercase tracking-widest">Ganhe indicando</div>
          <div className="text-sm text-white font-bold truncate">Indique e receba até 15% em comissões recorrentes</div>
        </div>
        <ArrowRight className="w-5 h-5 text-primary group-hover:translate-x-1 transition-transform" />
      </div>
    </Link>
  );
}
