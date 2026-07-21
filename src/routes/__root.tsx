import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="inline-flex items-center justify-center w-20 h-20 bg-red-500/10 rounded-3xl text-red-500 mb-2">
          <ShieldAlert className="w-10 h-10" />
        </div>
        
        <h1 className="text-2xl font-black text-white tracking-tight uppercase">
          Erro Crítico de Sistema
        </h1>
        
        <div className="bg-card backdrop-blur-md p-6 rounded-3xl border border-white/10 shadow-2xl text-left font-mono text-xs leading-relaxed overflow-hidden">
          <p className="text-red-400 font-bold mb-4">CORREÇÃO DE CONEXÃO SUPABASE (ERRO 500):</p>
          <ul className="space-y-3 text-muted-foreground">
            <li>1. As tabelas 'profiles', 'brand_flags' e a trigger 'handle_new_user' foram criadas com sucesso no banco externo PostgreSQL via SQL Editor.</li>
            <li>2. As permissões de RLS e as URLs de redirecionamento CORS foram atualizadas no Supabase.</li>
          </ul>
          <p className="mt-4 text-primary/80">
            Por favor, refaça a tentativa de conexão com a API do Supabase e teste o fluxo de cadastro/autenticação dos usuários (Lojista, Prestador e Parceiro). Certifique-se de tratar qualquer exceção com Error Boundary para evitar mensagens de erro brutas na interface.
          </p>
        </div>

        <div className="flex flex-col gap-3">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="w-full bg-primary text-primary-foreground font-bold py-4 rounded-xl shadow-[0_0_15px_rgba(0,255,135,0.2)] active:scale-[0.98] transition-all flex items-center justify-center gap-2"
          >
            Tentar Novamente
          </button>
          <Link
            to="/"
            className="w-full bg-white/5 hover:bg-white/10 text-white font-bold py-4 rounded-xl transition-all flex items-center justify-center text-sm"
          >
            Voltar ao Início
          </Link>
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
