import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  createRootRouteWithContext,
  useRouterState,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";
import { AlertTriangle } from "lucide-react";
import { Toaster } from "@/components/ui/sonner";
import { GlobalActionBar } from "@/components/GlobalActionBar";
import { OfflineBanner } from "@/components/OfflineBanner";
import appCss from "../styles.css?url";
import { useContextualCategory, getCategoryCssVars } from "../lib/user-category";

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1, viewport-fit=cover" },
      { title: "FIXXER - Hub de Serviços" },
    ],
    links: [{ rel: "stylesheet", href: appCss }],
  }),
  shellComponent: RootShell,
  component: RootComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-BR">
      <head><HeadContent /></head>
      <body className="antialiased scroll-smooth">{children}<Scripts /></body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const category = useContextualCategory(pathname);

  useEffect(() => {
    // Inicialização silenciosa de serviços
    void import("../lib/theme").then((m) => m.initTheme());
    void import("../lib/chat-read-queue").then((m) => m.initChatReadQueue());
    
    // REGRA DE OURO: O Root NÃO deve forçar redirecionamentos globais baseados em Auth.
    // Isso causa loops infinitos quando o roteador está em transição.
    // Os guardas de rota (_authenticated e auth) são os responsáveis.
  }, []);

  const hideBar = pathname === "/" || pathname.startsWith("/auth") || pathname.startsWith("/cadastro");

  return (
    <QueryClientProvider client={queryClient}>
      <div style={getCategoryCssVars(category)} className="contents">
        <Outlet />
        {!hideBar && <GlobalActionBar />}
        <OfflineBanner />
        <Toaster closeButton duration={2000} />
      </div>
    </QueryClientProvider>
  );
}