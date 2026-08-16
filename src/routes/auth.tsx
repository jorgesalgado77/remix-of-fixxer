import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/auth")({
  beforeLoad: async ({ location }) => {
    if (typeof window !== 'undefined') {
        const hasMasterBypass = localStorage.getItem('fixxer:master-bypass') === 'true';
        const rawToken = localStorage.getItem('fixxer-auth-token-v1');
        const cat = localStorage.getItem('fixxer:last-category');

        if ((hasMasterBypass && cat) || rawToken) {
            const target = cat === 'admin' ? '/admin/infoprodutos' : `/feed/${cat || 'lojista'}`;
            console.warn("[Auth Layout Guard] Sessão ativa detectada. Redirecionamento forçado para:", target);
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