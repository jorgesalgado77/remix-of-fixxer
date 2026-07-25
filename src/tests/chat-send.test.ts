import { describe, it, expect, vi } from "vitest";
import {
  isUuid,
  classifyChatError,
  sendWithRetry,
  validateChatIdentities,
} from "@/lib/chat-send";

const UID_A = "11111111-2222-3333-4444-555555555555";
const UID_B = "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee";

describe("isUuid", () => {
  it("aceita apenas UUIDs v4-like válidos", () => {
    expect(isUuid(UID_A)).toBe(true);
    expect(isUuid(UID_B.toUpperCase())).toBe(true);
  });
  it("rejeita IDs sintéticos (local-*, vazio, undefined)", () => {
    expect(isUuid("local-abc")).toBe(false);
    expect(isUuid("")).toBe(false);
    expect(isUuid(undefined)).toBe(false);
    expect(isUuid(null)).toBe(false);
    expect(isUuid("cmid-123")).toBe(false);
  });
});

describe("validateChatIdentities — regressão anti sender_id=local-*", () => {
  it("bloqueia sender sintético", () => {
    expect(validateChatIdentities("local-1", UID_B).ok).toBe(false);
    expect(validateChatIdentities("local-1", UID_B).reason).toBe("sender");
  });
  it("bloqueia peer inválido", () => {
    expect(validateChatIdentities(UID_A, "not-a-uuid").ok).toBe(false);
  });
  it("bloqueia conversa consigo mesmo", () => {
    expect(validateChatIdentities(UID_A, UID_A).reason).toBe("same");
  });
  it("aprova par UUID válido e distinto", () => {
    expect(validateChatIdentities(UID_A, UID_B).ok).toBe(true);
  });
});

describe("classifyChatError", () => {
  it("mapeia 401/JWT para sessão (não retriable)", () => {
    const c = classifyChatError({ code: "401", message: "JWT expired" });
    expect(c.kind).toBe("session");
    expect(c.retryable).toBe(false);
  });
  it("mapeia 42501 / RLS para rls", () => {
    const c = classifyChatError({ code: "42501", message: "new row violates row-level security policy" });
    expect(c.kind).toBe("rls");
    expect(c.retryable).toBe(false);
  });
  it("mapeia 22P02 para validation", () => {
    const c = classifyChatError({ code: "22P02", message: "invalid input syntax for type uuid" });
    expect(c.kind).toBe("validation");
  });
  it("mapeia Failed to fetch para network retriable", () => {
    const c = classifyChatError(new TypeError("Failed to fetch"));
    expect(c.kind).toBe("network");
    expect(c.retryable).toBe(true);
  });
});

describe("sendWithRetry", () => {
  it("retenta apenas erros de rede e devolve o valor final", async () => {
    let calls = 0;
    const op = vi.fn(async () => {
      calls++;
      if (calls < 3) throw new TypeError("Failed to fetch");
      return "ok";
    });
    const result = await sendWithRetry(op, { retries: 3, baseDelayMs: 1 });
    expect(result).toBe("ok");
    expect(calls).toBe(3);
  });

  it("propaga imediatamente erros de sessão (sem retry)", async () => {
    const op = vi.fn(async () => {
      throw { code: "401", message: "JWT expired" };
    });
    await expect(sendWithRetry(op, { retries: 3, baseDelayMs: 1 })).rejects.toMatchObject({ code: "401" });
    expect(op).toHaveBeenCalledTimes(1);
  });

  it("propaga RLS imediatamente (nunca mascara falha de permissão)", async () => {
    const op = vi.fn(async () => {
      throw { code: "42501", message: "row-level security" };
    });
    await expect(sendWithRetry(op, { retries: 3, baseDelayMs: 1 })).rejects.toMatchObject({ code: "42501" });
    expect(op).toHaveBeenCalledTimes(1);
  });
});

describe("Regressão: nunca aceitar sender_id sintético em payload", () => {
  it("um payload construído a partir de UID inválido é rejeitado antes do INSERT", () => {
    const buildPayload = (uid: unknown, peer: unknown) => {
      const v = validateChatIdentities(uid, peer);
      if (!v.ok) throw new Error(`invalid:${v.reason}`);
      return { sender_id: uid, recipient_id: peer };
    };
    expect(() => buildPayload("local-abc", UID_B)).toThrow(/invalid:sender/);
    expect(() => buildPayload(undefined, UID_B)).toThrow(/invalid:sender/);
    expect(buildPayload(UID_A, UID_B).sender_id).toBe(UID_A);
  });
});
