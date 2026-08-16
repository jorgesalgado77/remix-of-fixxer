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
            console.warn("[Auth Layout] Sessão ativa detectada, forçando redirecionamento brutal via window.location.href.");
            window.location.href = window.location.origin + target;
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