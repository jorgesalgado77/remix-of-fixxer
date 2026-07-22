import { createFileRoute } from "@tanstack/react-router";
import { LojistaPublicProfilePage } from "@/pages/LojistaPublicProfilePage";

export const Route = createFileRoute("/lojista/$id")({
  head: () => ({
    meta: [
      { title: "Perfil do Lojista — FIXXER" },
      { name: "description", content: "Conheça o lojista, veja projetos, avaliações e oportunidades abertas na plataforma FIXXER." },
      { property: "og:title", content: "Perfil do Lojista — FIXXER" },
      { property: "og:description", content: "Reputação, portfólio e oportunidades em aberto do lojista FIXXER." },
      { property: "og:type", content: "profile" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: LojistaPublicProfilePage,
});
