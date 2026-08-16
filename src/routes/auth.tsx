import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/auth")({
  beforeLoad: async ({ location }) => {
    if (typeof window !== 'undefined') {
        const hasMasterBypass = localStorage.getItem('fixxer:master-bypass') === 'true';
        const rawToken = localStorage.getItem('fixxer-auth-token-v1');
        const cat = localStorage.getItem('fixxer:last-category');

        if ((hasMasterBypass && cat) || rawToken) {
            const target = cat === 'admin' ? '/admin/infoprodutos' : `/feed/${cat || 'lojista'}`;
            const fullTarget = window.location.origin + target;
            console.warn("[Auth Layout Guard] Ejeção absoluta para:", fullTarget);
            
            // Limpeza bruta e imediata do cache do router para evitar loops de renderização
            if (typeof sessionStorage !== 'undefined') {
              Object.keys(sessionStorage).forEach(key => {
                if (key.includes('tsr-') || key.includes('tanstack')) {
                  sessionStorage.removeItem(key);
                }
              });
            }

            window.location.replace(fullTarget);
            return; 
        }
    }
    return {};
  },
  component: () => <Outlet />,
});