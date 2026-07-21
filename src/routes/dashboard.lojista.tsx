import { createFileRoute } from "@tanstack/react-router";
import { LojistaDashboard } from "@/pages/LojistaPage";

export const Route = createFileRoute("/dashboard/lojista")({
  component: LojistaDashboard,
});