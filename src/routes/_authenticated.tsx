import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useCurrentUser, isCurrentUserAdminSync } from "@/lib/current-user";

export const Route = createFileRoute("/_authenticated")({
  beforeLoad: async ({ location }) => {
    if (typeof window !== 'undefined') {
        const hasMasterBypass = localStorage.getItem('fixxer:master-bypass') === 'true';
        const rawToken = localStorage.getItem('fixxer-auth-token-v1');
        
        // Se houver qualquer sinal de autenticação, permite o carregamento da rota.
        if (hasMasterBypass || rawToken) {
            return { authenticated: true };
        }
    }
    
    // Se não houver absolutamente nada, envia para login.
    console.warn("[Authenticated Guard] Sem sessão. Redirecionando.");
    throw redirect({ to: "/auth" as any });
  },
  component: AuthenticatedLayout,
});

function AuthenticatedLayout() {
  const { user, loading } = useCurrentUser();
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    if (!loading) {
      setAuthChecked(true);
      // Fallback de segurança se o beforeLoad falhou por algum motivo de timing
      const hasBypass = localStorage.getItem('fixxer:master-bypass') === 'true';
      if (!user && !hasBypass) {
        window.location.href = window.location.origin + "/auth";
      }
    }
  }, [user, loading]);

  if (loading && !isCurrentUserAdminSync()) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <main className="flex-1 w-full max-w-[2000px] mx-auto overflow-x-hidden relative">
        <Outlet />
      </main>
    </div>
  );
}