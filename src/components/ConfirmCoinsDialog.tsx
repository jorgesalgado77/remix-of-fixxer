import React, { useEffect, useRef, useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Coins } from "lucide-react";

export interface CoinConfirmOptions {
  title: string;
  description: React.ReactNode;
  cost?: number;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "default" | "destructive";
}

type Resolver = (ok: boolean) => void;

interface Pending extends CoinConfirmOptions {
  id: number;
  resolve: Resolver;
}

let pushPending: ((p: Pending) => void) | null = null;
let idCounter = 0;

/**
 * Abre um modal centralizado com foco inicial, escape para fechar
 * e leitura correta pelo leitor de tela via aria-labelledby/-describedby.
 * Retorna true quando o usuário confirma.
 */
export function confirmCoins(opts: CoinConfirmOptions): Promise<boolean> {
  return new Promise((resolve) => {
    if (!pushPending) {
      // Provider não montado — fallback silencioso: confirma.
      console.warn("[confirmCoins] provider não montado; confirmando automaticamente.");
      resolve(true);
      return;
    }
    pushPending({ ...opts, id: ++idCounter, resolve });
  });
}

export function CoinConfirmProvider() {
  const [queue, setQueue] = useState<Pending[]>([]);
  const current = queue[0];
  const cancelRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    pushPending = (p) => setQueue((q) => [...q, p]);
    return () => {
      pushPending = null;
    };
  }, []);

  const done = (ok: boolean) => {
    if (!current) return;
    current.resolve(ok);
    setQueue((q) => q.slice(1));
  };

  return (
    <AlertDialog open={!!current} onOpenChange={(open) => { if (!open) done(false); }}>
      {current && (
        <AlertDialogContent
          className="rounded-3xl border-white/10 bg-[#1A1A1B] max-w-md"
          onEscapeKeyDown={() => done(false)}
        >
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-white text-base font-black uppercase italic">
              {typeof current.cost === "number" && current.cost > 0 && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-amber-500/15 text-amber-300 text-xs">
                  <Coins className="w-3.5 h-3.5" aria-hidden="true" />
                  −{current.cost}
                </span>
              )}
              {current.title}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground text-sm leading-relaxed">
              {current.description}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              ref={cancelRef}
              onClick={() => done(false)}
              className="rounded-xl"
            >
              {current.cancelLabel ?? "Cancelar"}
            </AlertDialogCancel>
            <AlertDialogAction
              autoFocus
              onClick={() => done(true)}
              className={
                current.variant === "destructive"
                  ? "rounded-xl bg-red-500 hover:bg-red-500/90 text-white"
                  : "rounded-xl bg-primary text-black hover:bg-primary/90 font-black uppercase italic"
              }
            >
              {current.confirmLabel ?? "Confirmar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      )}
    </AlertDialog>
  );
}
