import { createFileRoute } from "@tanstack/react-router";
import { LojistaPublicProfilePage } from "@/pages/LojistaPublicProfilePage";

export const Route = createFileRoute("/prestador/$id")({
  head: () => ({
    meta: [
      { title: "Perfil do Prestador — FIXXER" },
      { name: "description", content: "Conheça o prestador, seu portfólio, reputação e disponibilidade na plataforma FIXXER." },
      { property: "og:title", content: "Perfil do Prestador — FIXXER" },
      { property: "og:description", content: "Portfólio, reputação e oportunidades do prestador FIXXER." },
      { property: "og:type", content: "profile" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: LojistaPublicProfilePage,
});
