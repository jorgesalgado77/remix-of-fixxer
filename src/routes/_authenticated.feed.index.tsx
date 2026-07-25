import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { Loader2 } from "lucide-react";
import { getCurrentCategory } from "@/lib/current-user";

export const Route = createFileRoute("/_authenticated/feed/")({
  component: FeedRedirect,
});

function FeedRedirect() {
  const navigate = useNavigate();

  useEffect(() => {
    (async () => {
      const cat = await getCurrentCategory();
      let target = "/feed/prestador";
      if (cat === "lojista") target = "/feed/lojista";
      else if (cat === "fornecedor") target = "/feed/parceiro";
      else if (cat === "cliente") target = "/feed/cliente";
      navigate({ to: target as any, replace: true });
    })();
  }, [navigate]);

  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center gap-3">
      <Loader2 className="w-8 h-8 text-primary animate-spin" />
      <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">
        Abrindo o feed da sua categoria...
      </p>
    </div>
  );
}
