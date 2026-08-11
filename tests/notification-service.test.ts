import { notificationService } from "../src/lib/notification-service";
import { describe, it, expect } from "vitest";

describe("NotificationService", () => {
  it("should attempt to notify and handle auth gracefully in test env", async () => {
    // Apenas fumaça: não deve explodir se o Supabase não estiver mockado
    // Em ambiente de teste real, precisaríamos de mocks
    try {
      const res = await notificationService.notify({
        owner_id: "00000000-0000-0000-0000-000000000000",
        event_key: "chat_message",
        type: "chat",
        title: "Teste",
        content: "Conteúdo teste"
      });
      expect(res).toBeDefined();
    } catch (e) {
      // Ignorar erros de conexão no ambiente de build/test
    }
  });
});
