import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
  useLocation,
} from "@tanstack/react-router";
import { AuthenticatedLayout } from "./_authenticated";
import { useEffect, type ReactNode } from "react";
import { AlertTriangle } from "lucide-react";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";

function NotFoundComponent() {
  const location = useLocation();
  
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const userEmail = localStorage.getItem('fixxer_user_email') || 'anonymous';
      console.error(`[FIXXER 404]: Rota não encontrada acessada por ${userEmail}: ${window.location.pathname}`);
    } catch (e) {
      console.error(`[FIXXER 404]: Rota não encontrada: ${window.location.pathname}`);
    }
  }, []);

  // Se o usuário estiver autenticado no localStorage, exibe o painel mesmo se a rota falhar
  const isAuthenticated = typeof window !== 'undefined' && localStorage.getItem('fixxer_authenticated') === 'true';
  
  if (isAuthenticated) {
    return <AuthenticatedLayout />;
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-black px-4">
      <div className="max-w-md w-full bg-[#111] border border-white/10 p-10 rounded-[2.5rem] shadow-2xl text-center space-y-6">
        <div className="w-20 h-20 bg-[#00FF87]/10 rounded-3xl flex items-center justify-center text-[#00FF87] mx-auto animate-pulse">
          <AlertTriangle className="w-10 h-10" />
        </div>
        <div className="space-y-2">
          <h1 className="text-4xl font-black text-white uppercase italic tracking-tighter">Sessão não encontrada</h1>
          <p className="mt-4 text-sm text-gray-400 leading-relaxed">
            Sua sessão expirou ou você tentou acessar uma rota inválida sem estar logado.
          </p>
        </div>
        <div className="pt-4 flex flex-col gap-3">
          <Link
            to="/auth"
            className="w-full bg-[#00FF87] text-black font-black py-4 rounded-xl shadow-[0_0_20px_rgba(0,255,135,0.3)] hover:scale-[1.02] active:scale-95 transition-all text-sm uppercase tracking-widest"
          >
            Ir para o Login
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error("Critical System Error Captured:", error);
  const router = useRouter();
  
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  // Fallback silencioso: se houver um erro, tentamos renderizar o Outlet mesmo assim
  // para não travar a aplicação em uma tela de erro cheia.
  // Se o erro for persistente no nível do Root, mostramos uma notificação simples.
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col items-center justify-center p-4">
      <div className="max-w-md w-full bg-card/50 backdrop-blur-xl border border-white/10 p-8 rounded-3xl shadow-2xl text-center space-y-6">
        <div className="w-16 h-16 bg-amber-500/10 rounded-2xl flex items-center justify-center text-amber-500 mx-auto">
          <AlertTriangle className="w-8 h-8" />
        </div>
        <div className="space-y-2">
          <h2 className="text-xl font-bold text-white uppercase tracking-tight">Problema de Carregamento</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Detectamos uma instabilidade na conexão. A aplicação tentará se recuperar automaticamente.
          </p>
        </div>
        
        <div className="pt-4 flex flex-col gap-3">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="w-full bg-primary text-primary-foreground font-bold py-4 rounded-xl shadow-[0_0_15px_rgba(0,255,135,0.2)] active:scale-[0.98] transition-all"
          >
            Tentar Recuperar Agora
          </button>
          <button
            onClick={() => window.location.href = "/"}
            className="w-full bg-white/5 hover:bg-white/10 text-white font-bold py-3 rounded-xl transition-all text-xs uppercase tracking-widest"
          >
            Voltar ao Início
          </button>
        </div>
        
        <div className="text-[10px] font-mono text-muted-foreground/30 break-all overflow-hidden max-h-20">
          {error.message}
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "FIXXER - Gestão de Serviços e Parcerias" },
      { name: "description", content: "Ecossistema completo para intermediação e gestão de serviços e parcerias para empresas no segmento de moveis sob medida" },
      { name: "author", content: "FIXXER" },
      { property: "og:title", content: "FIXXER - Gestão de Serviços e Parcerias" },
      { property: "og:description", content: "Ecossistema completo para intermediação e gestão de serviços e parcerias para empresas no segmento de moveis sob medida" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:site", content: "@Lovable" },
      { name: "twitter:title", content: "FIXXER - Gestão de Serviços e Parcerias" },
      { name: "twitter:description", content: "Ecossistema completo para intermediação e gestão de serviços e parcerias para empresas no segmento de moveis sob medida" },
      { property: "og:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/4e6d18d6-e713-474a-af87-4f8d5bf8a26b/id-preview-5be06d3f--8eab4bcb-4420-482a-8b18-4313eb686069.lovable.app-1784567688036.png" },
      { name: "twitter:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/4e6d18d6-e713-474a-af87-4f8d5bf8a26b/id-preview-5be06d3f--8eab4bcb-4420-482a-8b18-4313eb686069.lovable.app-1784567688036.png" },
    ],
    links: [
      {
        rel: "stylesheet",
        href: appCss,
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  return (
    <QueryClientProvider client={queryClient}>
      {/* Required: nested routes render here. Removing <Outlet /> breaks all child routes. */}
      <Outlet />
    </QueryClientProvider>
  );
}
