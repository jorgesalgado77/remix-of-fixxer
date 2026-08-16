import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useCurrentUser, isCurrentUserAdminSync } from "@/lib/current-user";

export const Route = createFileRoute("/_authenticated")({
  beforeLoad: async ({ location }) => {
    if (typeof window !== 'undefined') {
        const hasMasterBypass = localStorage.getItem('fixxer:master-bypass') === 'true';
        const rawToken = localStorage.getItem('fixxer-auth-token-v1');
        
        // Se estiver logado e tentar acessar /auth, sai de lá imediatamente
        const isAuthRoute = location.pathname.startsWith('/auth');
        if (isAuthRoute && (hasMasterBypass || rawToken)) {
            const cat = localStorage.getItem('fixxer:last-category') || 'lojista';
            const target = cat === 'admin' ? '/admin/infoprodutos' : `/feed/${cat}`;
            console.warn("[Auth Guard] Já autenticado em rota de login, forçando saída.");
            
            if (typeof window !== 'undefined') {
                window.location.replace(window.location.origin + target);
                return { authenticated: true };
            }
            throw redirect({ to: target as any });
        }

        // Se tiver bypass ou token, permite acesso a rotas protegidas
        if (hasMasterBypass || rawToken) {
            return { authenticated: true };
        }
    }
    
    // Rotas de auth são permitidas para não autenticados
    if (location.pathname.startsWith('/auth')) return { authenticated: false };

    // Bloqueia qualquer outra rota se não houver sessão
    console.warn("[Authenticated Guard] Acesso negado, redirecionando para /auth");
    throw redirect({ to: "/auth" as any });
  },
  component: AuthenticatedLayout,
});

function AuthenticatedLayout() {
  const { user, loading } = useCurrentUser();

  useEffect(() => {
    if (!loading) {
      const hasBypass = localStorage.getItem('fixxer:master-bypass') === 'true';
      const rawToken = localStorage.getItem('fixxer-auth-token-v1');
      const isAuthPage = window.location.pathname.startsWith('/auth');

      if (!user && !hasBypass && !rawToken && !isAuthPage) {
        console.warn("[Authenticated Layout] Sem sessão. Redirecionando para login.");
        window.location.replace(window.location.origin + "/auth");
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