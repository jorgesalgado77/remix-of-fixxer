import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { Loader2 } from "lucide-react";

export const Route = createFileRoute("/feed/")({
  component: FeedRedirect,
});

function FeedRedirect() {
  const navigate = useNavigate();

  useEffect(() => {
    const role =
      typeof window !== "undefined"
        ? (localStorage.getItem("fixxer_user_role") || "").toLowerCase()
        : "";

    let target = "/feed/prestador";
    if (role.includes("lojista")) target = "/feed/lojista";
    else if (role.includes("parceiro") || role.includes("fornec"))
      target = "/feed/parceiro";
    else if (role.includes("cliente") || role.includes("casual"))
      target = "/feed/cliente";
    else if (role.includes("prestador")) target = "/feed/prestador";

    navigate({ to: target as any, replace: true });
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
