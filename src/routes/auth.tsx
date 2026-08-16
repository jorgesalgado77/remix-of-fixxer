import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/auth")({
  beforeLoad: async ({ location }) => {
    if (typeof window !== 'undefined') {
        const hasMasterBypass = localStorage.getItem('fixxer:master-bypass') === 'true';
        const rawToken = localStorage.getItem('fixxer-auth-token-v1');
        
        if (hasMasterBypass || rawToken) {
            const { getCurrentCategory } = await import("@/lib/current-user");
            const cat = await getCurrentCategory(true);
            const target = cat === 'admin' ? '/admin/infoprodutos' : `/feed/${cat}`;
            
            // Limpeza agressiva do estado do Router
            if (typeof sessionStorage !== 'undefined') {
                Object.keys(sessionStorage).forEach(key => {
                    if (key.includes('tsr-') || key.includes('tanstack')) {
                        sessionStorage.removeItem(key);
                    }
                });
            }
            
            console.warn("[Auth Layout Guard] Sessão ativa detectada. Redirecionamento absoluto para:", target);
            window.location.replace(window.location.origin + target);
            return { authenticated: true };
        }
    }
    return {};
  },
  component: AuthLayout,
});

function AuthLayout() {
  return (
    <div className="min-h-screen bg-black flex flex-col">
      <Outlet />
    </div>
  );
}