import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/auth")({
  beforeLoad: async ({ location }) => {
    // Se já estiver logado (check rápido no storage), manda para o feed
    if (typeof window !== 'undefined') {
      const hasSession = !!localStorage.getItem('fixxer-auth-token-v1');
      const hasBypass = localStorage.getItem('fixxer:master-bypass') === 'true';
      
      if ((hasSession || hasBypass) && (location.pathname === '/auth' || location.pathname === '/auth/')) {
        console.log("[Auth Layout Guard] Usuário já logado detectado no storage. Redirecionando.");
        throw redirect({ to: '/feed' as any });
      }
    }
  },
  component: () => (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Outlet />
    </div>
  ),
});