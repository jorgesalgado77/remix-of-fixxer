import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/auth")({
  beforeLoad: async ({ location }) => {
    // CAMADA 0: Verificação agressiva de storage antes de qualquer render
    if (typeof window !== 'undefined') {
      const raw = localStorage.getItem('fixxer-auth-token-v1');
      const hasBypass = localStorage.getItem('fixxer:master-bypass') === 'true';
      let hasSession = false;
      
      if (raw) {
        try {
          const parsed = JSON.parse(raw);
          if (parsed && (parsed.user || parsed.session?.user)) hasSession = true;
        } catch {}
      }
      
      const isAuthPath = location.pathname === '/auth' || location.pathname === '/auth/' || location.pathname.startsWith('/auth/');
      
      if ((hasSession || hasBypass) && isAuthPath) {
        console.warn("[Auth Layout Guard] Sessão ativa detectada. Forçando saída.");
        const targetCategory = localStorage.getItem('fixxer:last-category') || 'lojista';
        const target = targetCategory === 'admin' ? '/admin/infoprodutos' : `/feed/${targetCategory}`;
        
        // Se estivermos no navegador, forçamos o replace imediato e retornamos redirect para o router
        setTimeout(() => {
          window.location.replace(window.location.origin + target);
        }, 50);
        throw redirect({ to: target as any });
      }
    }
    return {};
  },
  component: AuthLayout,
});

function AuthLayout() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Outlet />
    </div>
  );
}