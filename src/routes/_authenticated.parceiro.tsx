import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/parceiro")({
  component: () => <div className="p-8 text-white">Dashboard do Parceiro (Em construção)</div>,
});
