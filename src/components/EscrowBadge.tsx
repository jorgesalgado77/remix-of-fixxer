import { ShieldCheck, Info } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export function EscrowBadge() {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex items-center gap-2 bg-[#00FF87]/10 border border-[#00FF87]/20 px-3 py-1.5 rounded-full cursor-help hover:bg-[#00FF87]/15 transition-colors group">
            <ShieldCheck className="w-4 h-4 text-[#00FF87]" />
            <span className="text-[10px] font-black text-[#00FF87] uppercase italic leading-none">
              Custódia Protegida FIXXER
            </span>
            <Info className="w-3 h-3 text-[#00FF87] opacity-50 group-hover:opacity-100 transition-opacity" />
          </div>
        </TooltipTrigger>
        <TooltipContent className="bg-black border-white/10 text-[10px] max-w-[200px] text-center p-3 rounded-xl">
          <p className="font-bold text-[#00FF87] uppercase mb-1">Pagamento Garantido</p>
          <p className="text-white/70">O saldo só é liberado mediante comprovação fotográfica do serviço concluído.</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
