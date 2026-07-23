import { createFileRoute } from "@tanstack/react-router";
import FeedParceiroPage from "@/pages/FeedParceiroPage";

export const Route = createFileRoute("/_authenticated/feed/parceiro")({
  head: () => ({
    meta: [
      { title: "Feed do Fornecedor B2B — FIXXER" },
      {
        name: "description",
        content:
          "Mural de demandas B2B de lojistas e oportunidades de parceria para fornecedores FIXXER.",
      },
      { property: "og:title", content: "Feed do Fornecedor B2B — FIXXER" },
      {
        property: "og:description",
        content:
          "Mural de demandas B2B de lojistas e oportunidades de parceria para fornecedores FIXXER.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: FeedParceiroPage,
});
