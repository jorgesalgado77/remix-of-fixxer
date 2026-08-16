import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useCurrentUser, isCurrentUserAdminSync } from "@/lib/current-user";

export const Route = createFileRoute("/_authenticated")({
  beforeLoad: async ({ location }) => {
    // No beforeLoad, permitimos o carregamento se houver sinais de autenticação no storage.
    // Isso evita bloqueios síncronos pesados e loops de redirecionamento imediato.
    if (typeof window !== 'undefined') {
        const hasMasterBypass = localStorage.getItem('fixxer:master-bypass') === 'true';
        const rawToken = localStorage.getItem('fixxer-auth-token-v1');
        
        if (hasMasterBypass || rawToken) {
            return { authenticated: true };
        }
    }
    
    // Se não estiver em rota de auth e não tiver nada, manda para /auth
    if (!location.pathname.startsWith('/auth')) {
      console.warn("[Authenticated Guard] Acesso negado. Redirecionando para login.");
      throw redirect({ to: "/auth" as any });
    }
    
    return { authenticated: false };
  },
  component: AuthenticatedLayout,
});

function AuthenticatedLayout() {
  const { user, loading } = useCurrentUser();

  useEffect(() => {
    // Fallback de segurança em runtime: se o carregamento terminar e não houver usuário nem bypass,
    // e NÃO estivermos na página de login, forçamos a ida para lá.
    if (!loading) {
      const hasBypass = localStorage.getItem('fixxer:master-bypass') === 'true';
      if (!user && !hasBypass && !window.location.pathname.startsWith('/auth')) {
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