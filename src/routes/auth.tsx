import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/auth")({
  beforeLoad: async ({ location }) => {
    if (typeof window !== 'undefined') {
        const hasMasterBypass = localStorage.getItem('fixxer:master-bypass') === 'true';
        const rawToken = localStorage.getItem('fixxer-auth-token-v1');
        const cat = localStorage.getItem('fixxer:last-category');

        if ((hasMasterBypass && cat) || rawToken) {
            const target = cat === 'admin' ? '/admin/infoprodutos' : `/feed/${cat || 'lojista'}`;
            if (window.location.pathname !== target) {
                console.warn("[Auth Layout Guard] Redirecionamento forçado via window.location.replace para:", target);
                window.location.replace(window.location.origin + target);
                return { authenticated: true };
            }
        }
    }
    return {};
  },
  component: () => <Outlet />,
});
