import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { supabaseExternal } from "@/lib/supabaseExternal";

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

type Cat = "prestador" | "lojista" | "fornecedor" | "cliente";

function pathFor(cat: Cat, id: string): string {
  const enc = encodeURIComponent(id);
  if (cat === "prestador") return `/prestador/${enc}`;
  if (cat === "fornecedor") return `/parceiro/${enc}`;
  if (cat === "cliente") return `/cliente/${enc}`;
  return `/lojista/${enc}`;
}

function fromRole(role: string | null | undefined): Cat | null {
  const r = String(role || "").toLowerCase();
  if (!r) return null;
  if (r.includes("prestador") || r.includes("provider") || r.includes("servi")) return "prestador";
  if (r.includes("lojista") || r.includes("store") || r.includes("loja")) return "lojista";
  if (r.includes("fornec") || r.includes("parceiro") || r.includes("b2b") || r.includes("supplier")) return "fornecedor";
  if (r.includes("cliente") || r.includes("customer") || r.includes("final")) return "cliente";
  return null;
}

async function detectCategory(userId: string): Promise<Cat> {
  // 1) Tabelas especializadas — fonte autoritativa.
  const probes: Array<{ table: string; cat: Cat }> = [
    { table: "provider_profiles", cat: "prestador" },
    { table: "store_profiles", cat: "lojista" },
    { table: "supplier_profiles", cat: "fornecedor" },
  ];
  for (const p of probes) {
    try {
      const { data } = await supabaseExternal
        .from(p.table)
        .select("user_id, id")
        .or(`user_id.eq.${userId},id.eq.${userId}`)
        .limit(1)
        .maybeSingle();
      if (data) return p.cat;
    } catch { /* tabela pode não existir — segue */ }
  }
  // 2) Fallback: coluna role em profiles.
  try {
    const { data } = await supabaseExternal
      .from("profiles")
      .select("role")
      .eq("id", userId)
      .maybeSingle();
    const cat = fromRole((data as any)?.role);
    if (cat) return cat;
  } catch { /* ignore */ }
  // 3) Último recurso: cliente final (tema neutro-verde, sem tratar como lojista por engano).
  return "cliente";
}

function PerfilRedirectPage() {
  const { userId } = Route.useParams();
  const [target, setTarget] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const cat = await detectCategory(userId);
      if (!cancelled) setTarget(pathFor(cat, userId));
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
