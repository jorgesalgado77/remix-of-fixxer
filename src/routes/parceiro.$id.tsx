import { createFileRoute } from "@tanstack/react-router";
import { LojistaPublicProfilePage } from "@/pages/LojistaPublicProfilePage";

export const Route = createFileRoute("/parceiro/$id")({
  head: () => ({
    meta: [
      { title: "Perfil do Fornecedor — FIXXER" },
      { name: "description", content: "Conheça o fornecedor B2B, seu catálogo, prazos e reputação na plataforma FIXXER." },
      { property: "og:title", content: "Perfil do Fornecedor — FIXXER" },
      { property: "og:description", content: "Catálogo, reputação e demandas B2B do fornecedor FIXXER." },
      { property: "og:type", content: "profile" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: LojistaPublicProfilePage,
});
