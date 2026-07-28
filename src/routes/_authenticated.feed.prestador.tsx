import { createFileRoute } from "@tanstack/react-router";
import FeedPrestadorPage from "@/components/pages/FeedPrestadorPage";
import { validateAdFilterSearch } from "@/lib/ad-filter-search";

export const Route = createFileRoute("/_authenticated/feed/prestador")({
  validateSearch: validateAdFilterSearch,
  head: () => ({
    meta: [
      { title: "Feed do Prestador — FIXXER" },
      {
        name: "description",
        content: "Mural de oportunidades e Ordens de Serviço para prestadores FIXXER.",
      },
      { property: "og:title", content: "Feed do Prestador — FIXXER" },
      {
        property: "og:description",
        content: "Mural de oportunidades e Ordens de Serviço para prestadores FIXXER.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: FeedPrestadorPage,
});
