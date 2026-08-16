import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/auth")({
  beforeLoad: async ({ location }) => {
    // Se já estiver logado (check rápido no storage), manda para o feed
    if (typeof window !== 'undefined') {
      const raw = localStorage.getItem('fixxer-auth-token-v1');
      const hasBypass = localStorage.getItem('fixxer:master-bypass') === 'true';
      let hasSession = false;
      
      if (raw) {
        try {
          const parsed = JSON.parse(raw);
          if (parsed && parsed.user) hasSession = true;
        } catch {}
      }
      
      if ((hasSession || hasBypass) && (location.pathname === '/auth' || location.pathname === '/auth/')) {
        console.warn("[Auth Layout Guard] Sessão ativa detectada. Forçando saída via window.location.");
        window.location.replace('/feed');
        // O redirect do router serve como fallback se o replace demorar
        throw redirect({ to: '/feed' as any });
      }
    }
    return {};
  },
  component: () => (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Outlet />
    </div>
  ),
});