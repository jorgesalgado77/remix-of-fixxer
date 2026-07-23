import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/feed")({
  head: () => ({
    meta: [
      { title: "Feed — FIXXER" },
      { name: "description", content: "Feed multicategorias FIXXER." },
      { property: "og:title", content: "Feed — FIXXER" },
      { property: "og:description", content: "Feed multicategorias FIXXER." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: FeedLayout,
});

function FeedLayout() {
  return <Outlet />;
}
