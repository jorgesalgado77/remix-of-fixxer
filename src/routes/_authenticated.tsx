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
        
        // Limpeza absoluta e redirecionamento instantâneo
        if (typeof sessionStorage !== 'undefined') {
          Object.keys(sessionStorage).forEach(key => {
            if (key.includes('tsr-') || key.includes('tanstack')) {
              sessionStorage.removeItem(key);
            }
          });
        }
        window.location.replace(window.location.origin + target);
        return; // Interrompe o carregamento da rota /auth
      }

      // Se NÃO estiver logado e NÃO estiver em rotas públicas, mandar para /auth
      const isPublic = location.pathname.startsWith('/auth') || 
                       location.pathname.startsWith('/cadastro') || 
                       location.pathname === '/';
      
      if (!hasMasterBypass && !rawToken && !isPublic) {
        console.warn("[Authenticated Guard] Acesso negado. Redirecionando para /auth.");
        window.location.replace(window.location.origin + '/auth');
        return { authenticated: false };
      }

      // Inicialização de serviços financeiros se logado
      if (hasMasterBypass || rawToken) {
        let uid = hasMasterBypass 
          ? localStorage.getItem('fixxer:bypass-uid') || (cat === 'admin' ? '6ba65048-803f-44f6-88d2-24d04fee1a0f' : 'b3378b88-5c46-4e50-9c2e-4b7264a4d6e9') 
          : JSON.parse(rawToken!).user.id;

        // Disparar auditoria e inicialização em paralelo
        // Otimização: Garantir que o cache de identidade está quente para evitar flash de "Usuário"
        void import("../lib/identity/identity-service").then(m => m.resolveIdentity(uid, { refresh: hasMasterBypass }));
        void import("../lib/bypass-audit").then(m => m.auditBypassAccess());
        void import("../lib/coins").then(m => m.initCoinsForUser(uid));
      }

      return { authenticated: !!(hasMasterBypass || rawToken) };
    }
    return { authenticated: false };
  },
  component: () => <Outlet />,
});