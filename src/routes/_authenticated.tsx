import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated")({
  beforeLoad: async ({ location }) => {
    if (typeof window !== 'undefined') {
        const hasMasterBypass = localStorage.getItem('fixxer:master-bypass') === 'true';
        const rawToken = localStorage.getItem('fixxer-auth-token-v1');
        const isAuthRoute = location.pathname.startsWith('/auth');
        const cat = localStorage.getItem('fixxer:last-category');

        if (hasMasterBypass || rawToken) {
            if (isAuthRoute) {
                const target = cat === 'admin' ? '/admin/infoprodutos' : `/feed/${cat || 'lojista'}`;
                console.warn("[Auth Guard] Logado detectado em /auth. Ejetando para", target);
                // Limpeza absoluta
                if (typeof sessionStorage !== 'undefined') {
                  Object.keys(sessionStorage).forEach(key => {
                    if (key.includes('tsr-') || key.includes('tanstack')) {
                      sessionStorage.removeItem(key);
                    }
                  });
                }
                window.location.href = window.location.origin + target;
                return { authenticated: true };
            }
            return { authenticated: true };
        }
    }
    
    // Fallback: se não estiver em /auth e não tiver token, redireciona
    if (!location.pathname.startsWith('/auth') && !location.pathname.startsWith('/cadastro')) {
        console.warn("[Authenticated Guard] Acesso protegido. Redirecionando para /auth.");
        throw redirect({ to: "/auth" as any });
    }

    return { authenticated: false };
  },
  component: () => <Outlet />,
});
