import { test, expect } from "@playwright/test";

/**
 * SMOKE TESTS DE SEGURANÇA - FIXXER GO-LIVE
 * Estes testes validam se as barreiras de RLS e privacidade estão ativas.
 */

test.describe("Segurança & RLS Smoke Tests", () => {
  
  test("deve impedir acesso a documentos privados de outro usuário", async ({ request }) => {
    // Tentativa de acessar um arquivo em documents-private/outro-user-uuid/...
    // O Supabase deve retornar 404 ou 403 dependendo da política de storage
    const response = await request.get("http://localhost:8080/storage/v1/object/documents-private/target-uuid/file.pdf");
    expect(response.status()).toBeGreaterThanOrEqual(401);
  });

  test("deve falhar ao tentar inserir mensagem para usuário que bloqueou", async ({ request }) => {
    // Este teste assume um estado de bloqueio pré-existente no banco
    // A policy RLS em chat_messages deve rejeitar o INSERT
    const response = await request.post("http://localhost:8080/rest/v1/chat_messages", {
      data: {
        sender_id: "meu-uuid",
        receiver_id: "user-que-me-bloqueou",
        content: "oi"
      },
      headers: { 'Prefer': 'return=minimal' }
    });
    expect(response.status()).toBe(403);
  });

  test("não deve permitir pular etapas da O.S. (ex: CRIADA -> CONCLUIDA)", async ({ request }) => {
    // Chama a RPC de transição com uma mudança ilegal
    const response = await request.post("http://localhost:8080/rest/v1/rpc/transition_os_status", {
      data: {
        _os_id: "some-os-uuid",
        _new_status: "CONCLUIDA"
      }
    });
    const result = await response.json();
    expect(result.ok).toBe(false);
    expect(result.error).toContain("Transição de estado não permitida");
  });

});
