import { createFileRoute } from "@tanstack/react-router";
import { LojistaPublicProfilePage } from "@/pages/LojistaPublicProfilePage";

export const Route = createFileRoute("/cliente/$id")({
  head: () => ({
    meta: [
      { title: "Perfil do Cliente — FIXXER" },
      { name: "description", content: "Conheça o cliente, suas necessidades e histórico na plataforma FIXXER." },
      { property: "og:title", content: "Perfil do Cliente — FIXXER" },
      { property: "og:description", content: "Necessidades e histórico do cliente FIXXER." },
      { property: "og:type", content: "profile" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: LojistaPublicProfilePage,
});
