/**
 * FIXXER — Rota `/profile` consolidada.
 *
 * A tela de "Perfil da Empresa" agora vive dentro do dashboard de cada papel
 * (ex.: LojistaPage → aba "profile"). Esta rota redireciona o usuário para
 * o dashboard correspondente ao seu papel, já com a aba de perfil ativa
 * (via hash `#profile`). Assim mantemos UMA única fonte de dados do perfil,
 * evitando divergência entre duas telas.
 */
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { Loader2 } from "lucide-react";
import { getCurrentCategory } from "@/lib/current-user";

export const Route = createFileRoute("/_authenticated/profile")({
  component: ProfileRedirect,
});

function targetFor(category: string, hash: string): string {
  const suffix = hash ? `#${hash}` : "#profile";
  switch (category) {
    case "admin":     return `/admin${suffix}`;
    case "prestador": return `/prestador${suffix}`;
    case "fornecedor":
    case "parceiro":  return `/parceiro${suffix}`;
    case "cliente":
    case "casual":    return `/cliente${suffix}`;
    case "lojista":
    default:          return `/lojista${suffix}`;
  }
}

function ProfileRedirect() {
  const navigate = useNavigate();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const cat = await getCurrentCategory().catch(() => "lojista");
      if (cancelled) return;
      const hash = (typeof window !== "undefined" ? window.location.hash.replace("#", "") : "") || "profile";
      const to = targetFor(String(cat || "lojista"), hash);
      // usa window.location para preservar hash de forma confiável
      window.location.replace(to);
    })();
    return () => { cancelled = true; };
  }, [navigate]);

  return (
    <div className="min-h-[40vh] flex items-center justify-center text-muted-foreground text-sm gap-2">
      <Loader2 className="w-4 h-4 animate-spin" /> Abrindo seu perfil...
    </div>
  );
}
