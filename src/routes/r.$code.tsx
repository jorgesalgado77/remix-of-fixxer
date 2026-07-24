import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { captureReferralCode } from "@/lib/affiliates";
import { Loader2 } from "lucide-react";

export const Route = createFileRoute("/r/$code")({
  component: ReferralCapture,
  head: () => ({
    meta: [
      { title: "FIXXER — Convite" },
      { name: "description", content: "Você foi convidado a fazer parte da rede FIXXER." },
    ],
  }),
});

function ReferralCapture() {
  const { code } = Route.useParams();
  const navigate = useNavigate();

  useEffect(() => {
    captureReferralCode(code);
    const t = setTimeout(() => {
      navigate({ to: "/cadastro" });
    }, 800);
    return () => clearTimeout(t);
  }, [code, navigate]);

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-6 px-6">
      <div className="w-16 h-16 rounded-2xl bg-primary/10 border border-primary/30 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
      <div className="text-center space-y-2">
        <h1 className="text-2xl font-black text-white uppercase tracking-tight">Você foi convidado!</h1>
        <p className="text-sm text-muted-foreground max-w-sm">
          Código de indicação <span className="text-primary font-black">{code.toUpperCase()}</span> aplicado.
          Redirecionando para o cadastro...
        </p>
      </div>
    </div>
  );
}
