import { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";

export const getRouter = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        // Reduz chamadas repetidas ao Supabase ao alternar entre abas.
        staleTime: 60_000,
        gcTime: 5 * 60_000,
        refetchOnWindowFocus: false,
        retry: 1,
      },
      mutations: {
        retry: 0,
      },
    },
  });

  const router = createRouter({
    routeTree,
    context: { queryClient },
    scrollRestoration: true,
    // Pré-carrega rota alvo ao pairar/tocar num <Link>, dando sensação instantânea.
    defaultPreload: "intent",
    defaultPreloadDelay: 50,
    // Query controla freshness — mantém 0 conforme integração TanStack Query.
    defaultPreloadStaleTime: 0,
    // Só mostra spinner se a rota realmente demorar; evita flash de loader.
    defaultPendingMs: 300,
    defaultPendingMinMs: 150,
  });

  return router;
};
