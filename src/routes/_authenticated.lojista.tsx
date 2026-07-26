import { createFileRoute } from "@tanstack/react-router";
import { LojistaDashboard } from "@/components/pages/LojistaPage";

export const Route = createFileRoute("/_authenticated/lojista")({
  component: LojistaDashboard,
});
