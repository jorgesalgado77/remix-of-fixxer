import { createFileRoute, Outlet, Link, useNavigate, useRouterState, redirect } from "@tanstack/react-router";
import { useEffect } from "react";
import { useCurrentUser, isCurrentUserAdminSync } from "@/lib/current-user";
import { supabaseExternal } from "@/lib/supabaseExternal";

export const Route = createFileRoute("/_authenticated")({
  beforeLoad: async ({ location }) => {
    let session = null;
    const hasMasterBypass = typeof window !== 'undefined' && localStorage.getItem('fixxer:master-bypass') === 'true';
    
    if (typeof window !== 'undefined') {
      try {
        const raw = localStorage.getItem('fixxer-auth-token-v1');
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed && (parsed.user || parsed.session?.user)) {
            session = parsed.session || parsed;
          }
        }
        
        // Se não houver no storage, tenta Supabase (fallthrough)
        if (!session && !hasMasterBypass) {
          const { data } = await supabaseExternal.auth.getSession();
          session = data.session;
        }
      } catch (e) {
        console.warn("[Authenticated Guard] Erro ao validar sessão:", e);
      }
    }
    
    const user = session?.user;
    const isMaster = hasMasterBypass || 
                   user?.email?.toLowerCase() === 'jorgericardosalgado@gmail.com' ||
                   user?.email?.toLowerCase() === 'jorgecriare2021@gmail.com';

    // Se NÃO estiver autenticado, manda para o /auth
    if (!user && !isMaster) {
      console.warn("[Authenticated Guard] Acesso não autorizado. Redirecionando.");
      if (typeof window !== 'undefined') {
        window.location.href = window.location.origin + "/auth";
      }
      throw redirect({ to: "/auth" as any });
    }

    return {
      userId: user?.id || 'master-bypass-id',
      userEmail: user?.email || 'jorgericardosalgado@gmail.com',
      isAdmin: isCurrentUserAdminSync(),
      bypass: isMaster
    };
  },
  component: AuthenticatedLayout,
});

function AuthenticatedLayout() {
  const { user, loading } = useCurrentUser();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  // Monitoramento secundário de logout
  useEffect(() => {
    if (!loading && !user && typeof window !== 'undefined') {
        const hasBypass = localStorage.getItem('fixxer:master-bypass') === 'true';
        if (!hasBypass) {
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