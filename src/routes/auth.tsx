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
        console.warn("[Auth Layout Guard] Sessão ativa detectada. Forçando saída via window.location.");
        // Usamos replace para não sujar o histórico com o loop
        window.location.replace(window.location.origin + '/feed');
        throw redirect({ to: '/feed' as any });
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