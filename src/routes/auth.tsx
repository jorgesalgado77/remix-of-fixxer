import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/auth")({
  beforeLoad: async ({ location }) => {
    // CAMADA 0: Verificação agressiva de storage antes de qualquer render
    if (typeof window !== 'undefined') {
      const storageKey = 'fixxer-auth-token-v1';
      const raw = localStorage.getItem(storageKey);
      const hasBypass = localStorage.getItem('fixxer:master-bypass') === 'true';
      let hasSession = false;
      
      if (raw) {
        try {
          const parsed = JSON.parse(raw);
          // Supabase JS v2 coloca o user direto ou dentro de session
          if (parsed && (parsed.user || parsed.session?.user)) {
            hasSession = true;
          }
        } catch {}
      }
      
      const isAuthPath = location.pathname === '/auth' || location.pathname === '/auth/' || location.pathname.startsWith('/auth/');
      
      if ((hasSession || hasBypass) && isAuthPath) {
        console.warn("[Auth Layout Guard] Sessão ativa detectada. Forçando saída imediata.");
        const targetCategory = localStorage.getItem('fixxer:last-category') || 'lojista';
        const target = targetCategory === 'admin' ? '/admin/infoprodutos' : `/feed/${targetCategory}`;
        
        // Evitamos loop infinito de redirecionamento do SPA limpando a stack do navegador
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