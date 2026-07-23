import { useNavigate, useRouterState } from "@tanstack/react-router";
import { Activity, PlusCircle, Store, Star, Menu } from "lucide-react";

/**
 * Barra de ações global inferior (mobile).
 * Presente em todas as telas do sistema para navegação rápida.
 */
export function GlobalActionBar() {
  const navigate = useNavigate();
  const { location } = useRouterState();
  const path = location.pathname;

  const isActive = (target: string) => path.startsWith(target);

  const goToMyProfile = () => {
    const profileId =
      (typeof window !== "undefined" && localStorage.getItem("fixxer_lojista_id")) ||
      "meu-perfil";
    navigate({ to: `/lojista/${profileId}` as any });
  };

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 bg-black/85 backdrop-blur-xl border-t border-white/10 p-3 z-[100] flex items-center justify-around pb-safe">
      <button
        onClick={() => navigate({ to: "/dashboard/lojista" as any })}
        className={`flex flex-col items-center gap-1 ${isActive("/dashboard") ? "text-primary" : "text-muted-foreground"}`}
      >
        <Activity className="w-5 h-5" />
        <span className="text-[8px] font-black uppercase italic">Painel</span>
      </button>
      <button
        onClick={() => navigate({ to: "/feed" as any })}
        className={`flex flex-col items-center gap-1 ${isActive("/feed") ? "text-primary" : "text-muted-foreground"}`}
      >
        <PlusCircle className="w-5 h-5" />
        <span className="text-[8px] font-black uppercase italic">Criar</span>
      </button>
      <div className="flex flex-col items-center gap-1 relative">
        <button
          onClick={goToMyProfile}
          className={`w-12 h-12 -mt-6 bg-black border rounded-full flex items-center justify-center shadow-2xl transition-all ${isActive("/lojista") || isActive("/perfil") ? "border-primary text-primary" : "border-white/20 text-white"}`}
        >
          <Store className="w-6 h-6" />
        </button>
        <span className="text-[8px] font-black uppercase italic mt-1">Perfil</span>
      </div>
      <button
        onClick={() => navigate({ to: "/dashboard/lojista" as any, hash: "reviews" })}
        className="flex flex-col items-center gap-1 text-muted-foreground"
      >
        <Star className="w-5 h-5" />
        <span className="text-[8px] font-black uppercase italic">Votos</span>
      </button>
      <button
        onClick={() => navigate({ to: "/dashboard/lojista" as any, hash: "menu" })}
        className="flex flex-col items-center gap-1 text-muted-foreground"
      >
        <Menu className="w-5 h-5" />
        <span className="text-[8px] font-black uppercase italic">Menu</span>
      </button>
    </div>
  );
}
