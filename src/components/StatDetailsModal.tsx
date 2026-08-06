import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";

export type StatListItem = {
  id: string;
  title: string;
  subtitle?: string;
  meta?: string;
  right?: string;
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
      <DialogContent className="max-w-lg bg-black/95 border border-white/10 rounded-3xl">
        <DialogHeader>
          <DialogTitle className="text-sm font-black text-white uppercase italic tracking-tight">
            {title}
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh] pr-2">
          {loading ? (
            <p className="text-[10px] text-muted-foreground uppercase font-bold py-8 text-center">
              Carregando...
            </p>
          ) : items.length === 0 ? (
            <p className="text-[10px] text-muted-foreground uppercase font-bold py-8 text-center">
              {emptyLabel}
            </p>
          ) : (
            <ul className="space-y-2">
              {items.map((it) => (
                <li
                  key={it.id}
                  className="flex items-start justify-between gap-3 p-3 rounded-2xl bg-white/5 border border-white/5"
                >
                  <div className="min-w-0">
                    <span className="block text-[11px] font-black text-white italic truncate">
                      {it.title}
                    </span>
                    {it.subtitle ? (
                      <span className="block text-[10px] text-muted-foreground truncate">
                        {it.subtitle}
                      </span>
                    ) : null}
                    {it.meta ? (
                      <span className="block text-[8px] text-muted-foreground uppercase font-bold tracking-widest mt-1">
                        {it.meta}
                      </span>
                    ) : null}
                  </div>
                  {it.right ? (
                    <span className="text-[10px] font-black text-primary whitespace-nowrap">
                      {it.right}
                    </span>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
