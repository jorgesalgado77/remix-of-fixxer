import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/auth")({
  beforeLoad: async ({ location }) => {
    if (typeof window !== 'undefined') {
      const storageKey = 'fixxer-auth-token-v1';
      const raw = localStorage.getItem(storageKey);
      const hasBypass = localStorage.getItem('fixxer:master-bypass') === 'true';
      let hasSession = false;
      
      if (raw) {
        try {
          const parsed = JSON.parse(raw);
          if (parsed && (parsed.user || parsed.session?.user)) {
            hasSession = true;
          }
        } catch {}
      }
      
      // Se tiver sessão, NÃO deixa entrar no layout de auth
      if (hasSession || hasBypass) {
        const targetCategory = localStorage.getItem('fixxer:last-category') || 'lojista';
        const target = targetCategory === 'admin' ? '/admin/infoprodutos' : `/feed/${targetCategory}`;
        
        console.warn("[Auth Layout Guard] Salto forçado via window.location.href");
        // Forçamos via href absoluto para quebrar o ciclo do TanStack
        window.location.href = window.location.origin + target;
        
        // Retornamos algo que impeça o render, mas o href mudará a página
        return { isRedirecting: true };
      }
    }
    return { isRedirecting: false };
  },
  component: AuthLayout,
});

function AuthLayout() {
  const { isRedirecting } = Route.useRouteContext();
  
  if (isRedirecting) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-primary animate-pulse font-black uppercase tracking-widest text-[10px]">
          Redirecionando...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Outlet />
    </div>
  );
}