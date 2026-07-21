import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/lojista")({
  component: () => <div className="p-8 text-white">Dashboard do Lojista (Em construção)</div>,
});
