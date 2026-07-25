import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { supabaseExternal } from "@/lib/supabaseExternal";

/**
 * Rota unificada de perfil público: `/perfil/:userId`.
 * Descobre o papel do usuário e redireciona para o perfil dedicado
 * (`/prestador/:id`, `/parceiro/:id` ou `/lojista/:id`).
 */
export const Route = createFileRoute("/perfil/$userId")({
  component: PerfilRedirectPage,
});

function targetFor(role: string | null | undefined, id: string): string {
  const r = (role || "").toLowerCase();
  if (r.includes("prestador")) return `/prestador/${encodeURIComponent(id)}`;
  if (r.includes("fornec") || r.includes("parceiro") || r.includes("b2b"))
    return `/parceiro/${encodeURIComponent(id)}`;
  return `/lojista/${encodeURIComponent(id)}`;
}

function PerfilRedirectPage() {
  const { userId } = Route.useParams();
  const [target, setTarget] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data } = await supabaseExternal
          .from("profiles")
          .select("role")
          .eq("id", userId)
          .maybeSingle();
        if (cancelled) return;
        setTarget(targetFor((data as any)?.role ?? null, userId));
      } catch {
        if (!cancelled) setTarget(`/lojista/${encodeURIComponent(userId)}`);
      }
    })();
    return () => { cancelled = true; };
  }, [userId]);

  if (target) return <Navigate to={target as any} replace />;
  return (
    <div className="min-h-[40vh] flex items-center justify-center text-muted-foreground text-sm gap-2">
      <Loader2 className="w-4 h-4 animate-spin" /> Abrindo perfil...
    </div>
  );
}
