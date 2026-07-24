import { createFileRoute } from "@tanstack/react-router";
import AgendaPage from "@/pages/AgendaPage";

export const Route = createFileRoute("/_authenticated/agenda")({
  head: () => ({
    meta: [
      { title: "Minha Agenda — Fixxer" },
      { name: "description", content: "Gerencie seus compromissos, check-ins e liberações de custódia." },
      { property: "og:title", content: "Minha Agenda — Fixxer" },
      { property: "og:description", content: "Compromissos, check-in/out e custódia integrada." },
    ],
  }),
  component: AgendaPage,
});
