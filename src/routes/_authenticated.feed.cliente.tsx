import { createFileRoute } from "@tanstack/react-router";
import FeedClientePage from "@/pages/FeedClientePage";

export const Route = createFileRoute("/_authenticated/feed/cliente")({
  head: () => ({
    meta: [
      { title: "Feed do Cliente — FIXXER" },
      {
        name: "description",
        content: "Encontre lojas e prestadores verificados e publique sua necessidade.",
      },
      { property: "og:title", content: "Feed do Cliente — FIXXER" },
      {
        property: "og:description",
        content: "Encontre lojas e prestadores verificados e publique sua necessidade.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: FeedClientePage,
});
