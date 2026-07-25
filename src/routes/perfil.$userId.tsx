import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { publicProfilePathFor, resolvePublicProfileCategory } from "@/lib/public-profile-category";

/**
 * Rota unificada de perfil público: `/perfil/:userId`.
 * Descobre a categoria REAL do usuário consultando as tabelas especializadas
 * (provider_profiles, store_profiles, supplier_profiles) — que são a fonte
 * autoritativa — e cai para a coluna `role` do perfil apenas como fallback.
 * Assim, o tema (cor) exibido na página pública é sempre o da categoria
 * VISITADA (prestador=âmbar, lojista=ciano, fornecedor=roxo, cliente=verde),
 * independentemente de quem está logado.
 */
export const Route = createFileRoute("/perfil/$userId")({
  component: PerfilRedirectPage,
});

function PerfilRedirectPage() {
  const { userId } = Route.useParams();
  const [target, setTarget] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const cat = await resolvePublicProfileCategory(userId);
      if (!cancelled) setTarget(publicProfilePathFor(cat, userId));
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
