import { createFileRoute } from "@tanstack/react-router";
import AppointmentDetailPage from "@/pages/AppointmentDetailPage";

export const Route = createFileRoute("/_authenticated/agenda/$id")({
  head: () => ({
    meta: [
      { title: "Detalhes do compromisso — Fixxer" },
      { name: "description", content: "Histórico completo, custódia, check-in/out e gerenciamento de fotos." },
      { property: "og:title", content: "Detalhes do compromisso — Fixxer" },
      { property: "og:description", content: "Timeline de eventos, custódia e comprovações do serviço." },
    ],
  }),
  component: AppointmentDetailPage,
});
