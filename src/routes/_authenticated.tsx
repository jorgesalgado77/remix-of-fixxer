import { createFileRoute, Outlet, Link, useNavigate, useRouterState, redirect, useMatch } from "@tanstack/react-router";
import { useEffect, useState, useMemo } from "react";
import { supabaseExternal } from "@/lib/supabaseExternal";
import { useCurrentUser, clearCurrentUserCache, isCurrentUserAdminSync } from "@/lib/current-user";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated")({
  beforeLoad: async ({ location }) => {
    // 1. BYPASS MASTER / EMERGENCY
    const isMasterEmail = 'jorgericardosalgado@gmail.com';
    const isProviderTestEmail = 'jorgecriare2021@gmail.com';
    const hasMasterBypass = typeof window !== 'undefined' && localStorage.getItem('fixxer:master-bypass') === 'true';
    
    console.log("[Route Guard] Bypass Info:", { hasMasterBypass, location: location.pathname });

    // 2. Verificação de Usuário via storage (Síncrono para evitar flicker/loop)
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
        
        // Se não tiver no storage, tenta a API, mas se estiver offline ou falhar, o bypass segura
        if (!session && !hasMasterBypass) {
          try {
            const { data } = await supabaseExternal.auth.getSession();
            session = data.session;
          } catch (e) {
            console.warn("[Route Guard] Supabase offline, tentando via bypass...");
          }
        }
      } catch (e) {
        console.warn("[Route Guard] Erro ao ler sessão:", e);
      }
    }
    
    const user = session?.user;
    const isMaster = user?.email?.toLowerCase() === isMasterEmail || 
                   user?.email?.toLowerCase() === isProviderTestEmail || 
                   hasMasterBypass;

    // 3. LOGICA DE REDIRECIONAMENTO E BYPASS
    if (user || isMaster) {
      // Se o usuário está logado e tenta acessar /auth, mandamos para o feed correto
      if (location.pathname === '/auth' || location.pathname === '/auth/' || location.pathname.startsWith('/auth/')) {
        console.log("[Route Guard] Redirecionando usuário logado de /auth para feed");
        if (typeof window !== 'undefined') {
          const targetCategory = localStorage.getItem('fixxer:last-category') || 'lojista';
          const target = targetCategory === 'admin' ? '/admin/infoprodutos' : `/feed/${targetCategory}`;
          
          setTimeout(() => {
            window.location.replace(window.location.origin + target);
          }, 50);
          return { userId: '', userEmail: '', isAdmin: false, bypass: false }; 
        }
        throw redirect({ to: "/feed" as any });
      }

      // Se passou pelas barreiras, retornamos os dados pro contexto
      return {
        userId: user?.id || 'master-emergency-id',
        userEmail: user?.email || isMasterEmail,
        isAdmin: isCurrentUserAdminSync(),
        bypass: isMaster
      };
    }

    // Se não houver nada, redireciona para login
    console.warn("[Route Guard] Sessão não encontrada. Redirecionando para /auth.");
    throw redirect({ to: "/auth" as any });
  },
  component: AuthenticatedLayout,
});

function AuthenticatedLayout() {
  const { user, loading: userLoading } = useCurrentUser();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  useEffect(() => {
    // Gerenciador de eventos de modal PIX (exemplo de utilitário global)
    const handlePixModalEvent = () => {
      // Logic would go here
    };
    window.addEventListener('fixxer:open-pix-modal', handlePixModalEvent);
    return () => window.removeEventListener('fixxer:open-pix-modal', handlePixModalEvent);
  }, []);

  useEffect(() => {
    if (userLoading) return;
    
    const isMasterEmail = user?.email?.toLowerCase() === 'jorgericardosalgado@gmail.com';
    const isProviderTestEmail = user?.email?.toLowerCase() === 'jorgecriare2021@gmail.com';
    const hasMasterBypass = typeof window !== 'undefined' && localStorage.getItem('fixxer:master-bypass') === 'true';
    const isMaster = isMasterEmail || isProviderTestEmail || hasMasterBypass;
    
    // REDIRECT FIX: Forçamos a saída de /auth se houver usuário detectado pelo hook
    if ((user || isMaster) && (pathname === '/auth' || pathname === '/auth/')) {
      console.log("[AuthenticatedLayout] Sessão confirmada. Navegando para feed.");
      const targetCategory = localStorage.getItem('fixxer:last-category') || 'lojista';
      const target = targetCategory === 'admin' ? '/admin/infoprodutos' : `/feed/${targetCategory}`;
      
      navigate({ to: target as any, replace: true }).catch(() => {
        window.location.replace(window.location.origin + target);
      });
      return;
    }

    // Se o carregamento terminou e realmente não tem usuário nem bypass, volta pro login
    if (!user && !isMaster && pathname !== '/auth') {
       navigate({ to: "/auth" as any, replace: true });
    }
  }, [user, userLoading, pathname, navigate]);

  if (userLoading && !isCurrentUserAdminSync()) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-muted-foreground text-xs font-bold uppercase tracking-widest animate-pulse">
            Validando Acesso...
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