import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { Loader2 } from "lucide-react";
import { getCurrentUserId, isCurrentUserAdmin, getCurrentCategory } from "@/lib/current-user";

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: DashboardRedirect,
});

function DashboardRedirect() {
  const navigate = useNavigate();

  useEffect(() => {
    (async () => {
      const uid = await getCurrentUserId();
      if (!uid) { navigate({ to: '/auth' as any }); return; }

      if (await isCurrentUserAdmin()) { navigate({ to: '/admin' as any }); return; }

      const cat = await getCurrentCategory();
      if (cat === 'lojista') navigate({ to: '/lojista' as any });
      else if (cat === 'fornecedor') navigate({ to: '/parceiro' as any });
      else if (cat === 'cliente') navigate({ to: '/cliente' as any });
      else navigate({ to: '/prestador' as any });
    })();
  }, [navigate]);

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4">
      <Loader2 className="w-8 h-8 text-primary animate-spin" />
      <p className="text-muted-foreground font-bold uppercase tracking-widest animate-pulse">
        Redirecionando para seu painel...
      </p>
    </div>
  );
}
