import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated")({
  beforeLoad: async ({ location }) => {
    if (typeof window !== 'undefined') {
      const hasMasterBypass = localStorage.getItem('fixxer:master-bypass') === 'true';
      const rawToken = localStorage.getItem('fixxer-auth-token-v1');
      const cat = localStorage.getItem('fixxer:last-category');

      // Se estiver logado e tentar acessar /auth, ejetar imediatamente
      if ((hasMasterBypass || rawToken) && location.pathname.startsWith('/auth')) {
        const target = cat === 'admin' ? '/admin/infoprodutos' : `/feed/${cat || 'lojista'}`;
        console.warn("[Auth Guard] Logado detectado em /auth. Ejetando para", target);
        
        if (typeof sessionStorage !== 'undefined') {
          Object.keys(sessionStorage).forEach(key => {
            if (key.includes('tsr-') || key.includes('tanstack')) {
              sessionStorage.removeItem(key);
            }
          });
        }
        window.location.replace(window.location.origin + target);
        return { authenticated: true };
      }

      // Se NÃO estiver logado e NÃO estiver em rotas públicas, mandar para /auth
      const isPublic = location.pathname.startsWith('/auth') || 
                       location.pathname.startsWith('/cadastro') || 
                       location.pathname === '/';
      
      if (!hasMasterBypass && !rawToken && !isPublic) {
        console.warn("[Authenticated Guard] Acesso negado. Redirecionando para /auth.");
        // Usamos replace absoluto para garantir limpeza do estado do router
        window.location.replace(window.location.origin + '/auth');
        return { authenticated: false };
      }

      return { authenticated: !!(hasMasterBypass || rawToken) };
    }
    return { authenticated: false };
  },
  component: () => <Outlet />,
});
