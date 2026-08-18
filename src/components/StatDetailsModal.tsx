import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Info, Receipt } from "lucide-react";

export type StatListItem = {
  id: string;
  title: string;
  subtitle?: string;
  meta?: string;
  right?: string;
  amount_gross?: number;
  amount_fee?: number;
  amount_net?: number;
};

export function StatDetailsModal({
  open,
  onOpenChange,
  title,
  emptyLabel,
  items,
  loading,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  title: string;
  emptyLabel: string;
  items: StatListItem[];
  loading?: boolean;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg bg-black/95 border border-white/10 rounded-3xl p-0 overflow-hidden shadow-2xl">
        <DialogHeader className="p-6 pb-2">
          <div className="flex items-center gap-3 mb-1">
            <div className="w-10 h-10 rounded-2xl bg-primary/10 border border-primary/30 flex items-center justify-center">
              <Receipt className="w-5 h-5 text-primary" />
            </div>
            <DialogTitle className="text-lg font-black text-white uppercase italic tracking-tight">
              {title}
            </DialogTitle>
          </div>
          <DialogDescription className="sr-only">Detalhamento de métricas e histórico</DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh] px-6 pb-6">
          {loading ? (
            <div className="p-12 flex flex-col items-center gap-3 text-white/40">
              <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
              <p className="text-[10px] uppercase font-black tracking-widest text-center">
                Carregando dados reais...
              </p>
            </div>
          ) : items.length === 0 ? (
            <div className="p-12 text-center">
              <Info className="w-8 h-8 mx-auto text-white/10 mb-2" />
              <p className="text-[10px] text-muted-foreground uppercase font-black tracking-widest">
                {emptyLabel}
              </p>
            </div>
          ) : (
            <ul className="space-y-3">
              {items.map((it) => (
                <li
                  key={it.id}
                  className="flex flex-col gap-3 p-4 rounded-2xl bg-white/[0.03] border border-white/5 hover:bg-white/[0.05] transition-all"
                >
                  <div className="flex items-start justify-between gap-3 w-full">
                    <div className="min-w-0">
                      <span className="block text-sm font-black text-white italic truncate">
                        {it.title}
                      </span>
                      {it.subtitle ? (
                        <span className="block text-[11px] text-white/50 truncate mt-0.5">
                          {it.subtitle}
                        </span>
                      ) : null}
                      {it.meta ? (
                        <span className="block text-[9px] text-white/30 uppercase font-black tracking-widest mt-1.5">
                          {it.meta}
                        </span>
                      ) : null}
                    </div>
                    {it.right ? (
                      <span className="text-sm font-black text-emerald-400 tabular-nums whitespace-nowrap">
                        {it.right}
                      </span>
                    ) : null}
                  </div>

                  {it.amount_gross !== undefined && (
                    <div className="mt-2 pt-3 border-t border-white/5 grid grid-cols-3 gap-2">
                      <div className="flex flex-col">
                        <span className="text-[8px] text-white/30 uppercase font-black tracking-widest mb-1">Bruto</span>
                        <span className="text-xs font-bold text-white/80">R$ {it.amount_gross.toFixed(2)}</span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[8px] text-white/30 uppercase font-black tracking-widest mb-1">Taxa (15%)</span>
                        <span className="text-xs font-bold text-rose-400/80">- R$ {(it.amount_fee ?? (it.amount_gross * 0.15)).toFixed(2)}</span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[8px] text-white/30 uppercase font-black tracking-widest mb-1 text-right">Líquido</span>
                        <span className="text-sm font-black text-emerald-400 text-right">R$ {(it.amount_net ?? (it.amount_gross * 0.85)).toFixed(2)}</span>
                      </div>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
