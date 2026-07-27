// @vitest-environment happy-dom
import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  findProfileField,
  focusProfileField,
  focusProfileFieldWithRetry,
} from "@/lib/profile-focus";

/**
 * Testes do fluxo `?focus=<campo>` na rota /profile.
 *
 * Cenários cobertos:
 * 1. Campo existe → foca input e aplica realce âmbar.
 * 2. Campo NÃO existe → retorna `not-found` (rota mostra toast).
 * 3. Chave inválida (vazia, null, undefined) → `invalid-key`.
 * 4. Retry: campo monta depois de alguns ticks.
 * 5. Realce é removido após `highlightMs`.
 */

function mountField(key: string, kind: "input" | "textarea" | "select" = "input") {
  const wrapper = document.createElement("div");
  wrapper.setAttribute("data-profile-field", key);
  const inner = document.createElement(kind);
  wrapper.appendChild(inner);
  document.body.appendChild(wrapper);
  return { wrapper, inner };
}

beforeEach(() => {
  document.body.innerHTML = "";
  vi.useRealTimers();
});

describe("findProfileField", () => {
  it("encontra elemento pelo data-profile-field", () => {
    const { wrapper } = mountField("whatsapp");
    expect(findProfileField("whatsapp")).toBe(wrapper);
  });

  it("retorna null quando campo não existe", () => {
    expect(findProfileField("nao-existe")).toBeNull();
  });

  it("retorna null para chaves inválidas", () => {
    expect(findProfileField("")).toBeNull();
    expect(findProfileField(null)).toBeNull();
    expect(findProfileField(undefined)).toBeNull();
  });

  it("não quebra com aspas/backslash na chave", () => {
    mountField('safe');
    expect(findProfileField('safe"')).not.toThrow?.();
    expect(() => findProfileField('a\\b"c')).not.toThrow();
  });
});

describe("focusProfileField", () => {
  it("foca o input interno quando o campo existe", () => {
    const { inner } = mountField("cnpj");
    const result = focusProfileField("cnpj");
    expect(result.ok).toBe(true);
    expect(document.activeElement).toBe(inner);
  });

  it("aplica classes de realce âmbar no wrapper", () => {
    const { wrapper } = mountField("email_contact");
    focusProfileField("email_contact", { highlightMs: 10_000 });
    expect(wrapper.classList.contains("ring-2")).toBe(true);
    expect(wrapper.classList.contains("ring-amber-400/70")).toBe(true);
  });

  it("remove o realce após highlightMs", async () => {
    vi.useFakeTimers();
    const { wrapper } = mountField("address");
    focusProfileField("address", { highlightMs: 500 });
    expect(wrapper.classList.contains("ring-2")).toBe(true);
    vi.advanceTimersByTime(600);
    expect(wrapper.classList.contains("ring-2")).toBe(false);
    vi.useRealTimers();
  });

  it("retorna not-found quando o campo não existe", () => {
    const result = focusProfileField("inexistente");
    expect(result).toEqual({ ok: false, reason: "not-found" });
  });

  it("retorna invalid-key para chaves vazias/nulas", () => {
    expect(focusProfileField("")).toEqual({ ok: false, reason: "invalid-key" });
    expect(focusProfileField(null)).toEqual({ ok: false, reason: "invalid-key" });
    expect(focusProfileField("   ")).toEqual({ ok: false, reason: "invalid-key" });
  });

  it("funciona com textarea e select", () => {
    mountField("bio", "textarea");
    mountField("state", "select");
    expect(focusProfileField("bio").ok).toBe(true);
    expect(focusProfileField("state").ok).toBe(true);
  });
});

describe("focusProfileFieldWithRetry", () => {
  it("resolve com sucesso quando o campo monta após alguns ticks", async () => {
    setTimeout(() => mountField("whatsapp"), 150);
    const result = await focusProfileFieldWithRetry("whatsapp", { tries: 10, delayMs: 60 });
    expect(result.ok).toBe(true);
  });

  it("desiste após esgotar tentativas e retorna not-found", async () => {
    const result = await focusProfileFieldWithRetry("nunca-vai-existir", { tries: 3, delayMs: 20 });
    expect(result).toEqual({ ok: false, reason: "not-found" });
  });

  it("desiste imediatamente com invalid-key", async () => {
    const start = Date.now();
    const result = await focusProfileFieldWithRetry("", { tries: 50, delayMs: 100 });
    expect(result).toEqual({ ok: false, reason: "invalid-key" });
    expect(Date.now() - start).toBeLessThan(200);
  });
});
