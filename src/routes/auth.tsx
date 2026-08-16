import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/auth")({
  beforeLoad: ({ location }) => {
    // Se estiver em /auth e tiver bypass, sai IMEDIATAMENTE
    if (typeof window !== 'undefined') {
        const hasMasterBypass = localStorage.getItem('fixxer:master-bypass') === 'true';
        const rawToken = localStorage.getItem('fixxer-auth-token-v1');
        
        if (hasMasterBypass || rawToken) {
            const cat = localStorage.getItem('fixxer:last-category') || 'lojista';
            const target = cat === 'admin' ? '/admin/infoprodutos' : `/feed/${cat}`;
            console.warn("[Auth Layout] Sessão ativa detectada, forçando redirecionamento para:", target);
            
            if (typeof window !== 'undefined') {
                window.location.replace(window.location.origin + target);
                return { authenticated: true };
            }
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