import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useCurrentUser, isCurrentUserAdminSync } from "@/lib/current-user";

export const Route = createFileRoute("/_authenticated")({
  beforeLoad: async ({ location }) => {
    if (typeof window !== 'undefined') {
        const hasMasterBypass = localStorage.getItem('fixxer:master-bypass') === 'true';
        const rawToken = localStorage.getItem('fixxer-auth-token-v1');
        const isAuthRoute = location.pathname.startsWith('/auth');

        if (hasMasterBypass || rawToken) {
            if (isAuthRoute) {
                const { getCurrentCategory } = await import("@/lib/current-user");
                const cat = await getCurrentCategory(true);
                const target = cat === 'admin' ? '/admin/infoprodutos' : `/feed/${cat}`;
                
                // Limpeza crítica para evitar loop
                if (typeof sessionStorage !== 'undefined') {
                  Object.keys(sessionStorage).forEach(key => {
                    if (key.includes('tsr-') || key.includes('tanstack')) {
                      sessionStorage.removeItem(key);
                    }
                  });
                }
                
                console.warn("[Auth Guard] Logado detectado em /auth. Ejetando brutalmente para", target);
                window.location.replace(window.location.origin + target);
                return { authenticated: true };
            }
            return { authenticated: true };
        }
    }
    
    if (!location.pathname.startsWith('/auth')) {
        console.warn("[Authenticated Guard] Acesso negado em", location.pathname, ". Redirecionando para /auth.");
        throw redirect({ to: "/auth" as any });
    }

    return { authenticated: false };
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