import { createFileRoute } from "@tanstack/react-router";
import NotificationPreferencesPage from "@/components/pages/NotificationPreferencesPage";

export const Route = createFileRoute("/_authenticated/preferencias/notificacoes")({
  head: () => ({
    meta: [
      { title: "Preferências de notificação — Fixxer" },
      { name: "description", content: "Ative ou desative alertas push e in-app por tipo de evento." },
      { property: "og:title", content: "Preferências de notificação — Fixxer" },
      { property: "og:description", content: "Controle granular de push e in-app por evento." },
    ],
  }),
  component: NotificationPreferencesPage,
});
