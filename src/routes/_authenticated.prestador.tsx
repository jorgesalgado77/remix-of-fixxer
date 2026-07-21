import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/prestador")({
  component: () => <div className="p-8 text-white">Dashboard do Prestador (Em construção)</div>,
});
