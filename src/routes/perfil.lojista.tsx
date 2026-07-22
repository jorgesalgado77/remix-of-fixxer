import { createFileRoute } from "@tanstack/react-router";
import { LojistaPublicProfilePage } from "@/pages/LojistaPublicProfilePage";

export const Route = createFileRoute("/perfil/lojista")({
  head: () => ({
    meta: [
      { title: "Meu Perfil Público — FIXXER" },
      { name: "description", content: "Visualize seu perfil público de lojista na plataforma FIXXER." },
      { property: "og:title", content: "Meu Perfil Público — FIXXER" },
      { property: "og:description", content: "Prévia do seu perfil público como lojista FIXXER." },
      { property: "og:type", content: "profile" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: LojistaPublicProfilePage,
});
