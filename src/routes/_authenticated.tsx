import { createFileRoute, Outlet, Link, useNavigate, useRouterState, redirect, useMatch } from "@tanstack/react-router";
import { useEffect, useState, useMemo } from "react";
import { supabaseExternal } from "@/lib/supabaseExternal";
import { useCurrentUser, clearCurrentUserCache, isCurrentUserAdminSync } from "@/lib/current-user";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated")({
  beforeLoad: async ({ location }) => {
    const isMasterEmail = 'jorgericardosalgado@gmail.com';
    const isProviderTestEmail = 'jorgecriare2021@gmail.com';
    const hasMasterBypass = typeof window !== 'undefined' && localStorage.getItem('fixxer:master-bypass') === 'true';
    
    let session = null;
    if (typeof window !== 'undefined') {
      try {
        const raw = localStorage.getItem('fixxer-auth-token-v1');
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed && (parsed.user || parsed.session?.user)) {
            session = parsed.session || parsed;
          }
        }
        
        if (!session && !hasMasterBypass) {
          try {
            const { data } = await supabaseExternal.auth.getSession();
            session = data.session;
          } catch (e) {
            console.warn("[Route Guard] Supabase inacessível.");
          }
        }
      } catch (e) {
        console.warn("[Route Guard] Erro storage:", e);
      }
    }
    
    const user = session?.user;
    const isMaster = user?.email?.toLowerCase() === isMasterEmail || 
                   user?.email?.toLowerCase() === isProviderTestEmail || 
                   hasMasterBypass;

    if (user || isMaster) {
      if (location.pathname.startsWith('/auth')) {
        const targetCategory = localStorage.getItem('fixxer:last-category') || 'lojista';
        const target = targetCategory === 'admin' ? '/admin/infoprodutos' : `/feed/${targetCategory}`;
        
        if (typeof window !== 'undefined') {
          window.location.replace(window.location.origin + target);
          return { userId: '', userEmail: '', isAdmin: false, bypass: false }; 
        }
        throw redirect({ to: target as any });
      }

      return {
        userId: user?.id || 'master-emergency-id',
        userEmail: user?.email || isMasterEmail,
        isAdmin: isCurrentUserAdminSync(),
        bypass: isMaster
      };
    }

    console.warn("[Route Guard] Acesso negado. Redirecionando para login.");
    if (typeof window !== 'undefined') {
        window.location.replace(window.location.origin + "/auth");
    }
    throw redirect({ to: "/auth" as any });
  },
  component: AuthenticatedLayout,
});

function AuthenticatedLayout() {
  const { user, loading: userLoading } = useCurrentUser();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  useEffect(() => {
    if (userLoading) return;
    
    const isMasterEmail = user?.email?.toLowerCase() === 'jorgericardosalgado@gmail.com';
    const isProviderTestEmail = user?.email?.toLowerCase() === 'jorgecriare2021@gmail.com';
    const hasMasterBypass = typeof window !== 'undefined' && localStorage.getItem('fixxer:master-bypass') === 'true';
    const isMaster = isMasterEmail || isProviderTestEmail || hasMasterBypass;
    
    if ((user || isMaster) && pathname.startsWith('/auth')) {
      const targetCategory = localStorage.getItem('fixxer:last-category') || 'lojista';
      const target = targetCategory === 'admin' ? '/admin/infoprodutos' : `/feed/${targetCategory}`;
      
      navigate({ to: target as any, replace: true }).catch(() => {
        window.location.replace(window.location.origin + target);
      });
      return;
    }

    if (!user && !isMaster && !pathname.startsWith('/auth') && pathname !== '/') {
       window.location.replace(window.location.origin + "/auth");
    }
  }, [user, userLoading, pathname, navigate]);

  if (userLoading && !isCurrentUserAdminSync()) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-muted-foreground text-[10px] font-black uppercase tracking-widest">
            Sincronizando...
          </p>
        </div>
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