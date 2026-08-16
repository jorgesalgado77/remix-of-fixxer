import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/auth")({
  beforeLoad: async ({ location }) => {
    if (typeof window !== 'undefined') {
      const storageKey = 'fixxer-auth-token-v1';
      const raw = localStorage.getItem(storageKey);
      const hasBypass = localStorage.getItem('fixxer:master-bypass') === 'true';
      let hasSession = false;
      
      if (raw) {
        try {
          const parsed = JSON.parse(raw);
          if (parsed && (parsed.user || parsed.session?.user)) {
            hasSession = true;
          }
        } catch {}
      }
      
      const isAuthPath = location.pathname.startsWith('/auth') || location.pathname === '/';
      
      if ((hasSession || hasBypass) && isAuthPath) {
        console.warn("[Auth Layout Guard] Sessão ativa. Saltando para feed.");
        const targetCategory = localStorage.getItem('fixxer:last-category') || 'lojista';
        const target = targetCategory === 'admin' ? '/admin/infoprodutos' : `/feed/${targetCategory}`;
        
        // Se já houver bypass, limpamos qualquer estado offline residual
        if (hasBypass) {
            localStorage.setItem('fixxer:offline-override', 'true');
        }

        window.location.replace(window.location.origin + target);
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