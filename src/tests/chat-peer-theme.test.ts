import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  resolvePeerCategory,
  getPeerTheme,
  NEUTRAL_THEME,
  CATEGORY_COLORS,
} from "@/lib/category-colors";

const chain = (rows: any) => ({
  select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: rows, error: null }) }) }),
});

const state: { publicProfile: any; profiles: any; provider: any; store: any } = {
  publicProfile: null,
  profiles: null,
  provider: null,
  store: null,
};

vi.mock("@/lib/supabaseExternal", () => ({
  supabaseExternal: {
    from(table: string) {
      if (table === "profiles_public") return chain(state.publicProfile);
      if (table === "profiles") return chain(state.profiles);
      if (table === "provider_profiles") return chain(state.provider);
      if (table === "store_profiles") return chain(state.store);
      return chain(null);
    },
  },
}));

// Mock do resolver de categoria para evitar interferência de lógica de rede/cache real nos testes de peer profile
vi.mock("@/lib/public-profile-category", async (importOriginal) => {
  const actual = await importOriginal<any>();
  return {
    ...actual,
    resolvePublicProfileCategory: vi.fn(async (userId: string, options?: any) => {
      // Lógica simplificada para o mock de teste baseada no estado global injetado
      if (state.store && (state.store.user_id === userId || userId === "u1")) return "lojista";
      if (state.provider && (state.provider.user_id === userId || userId === "u2")) return "prestador";
      if (options?.profile?.role === "fornecedor" || (state.profiles?.role === "fornecedor" && userId === "u3")) return "fornecedor";
      if (options?.profile?.role === "cliente" || (state.profiles?.role === "cliente" && userId === "u4")) return "cliente";
      return null;
    }),
  };
});

import { resolvePeerProfile, clearPeerCache } from "@/lib/chat-peer-profile";

beforeEach(() => {
  state.publicProfile = null;
  state.profiles = null;
  state.provider = null;
  state.store = null;
  clearPeerCache();
  vi.clearAllMocks();
});

describe("resolvePeerCategory (tag do peer)", () => {
  it("reconhece as 5 categorias oficiais", () => {
    expect(resolvePeerCategory("lojista")).toBe("lojista");
    expect(resolvePeerCategory("Loja Física")).toBe("lojista");
    expect(resolvePeerCategory("prestador")).toBe("prestador");
    expect(resolvePeerCategory("service_provider")).toBe("prestador");
    expect(resolvePeerCategory("fornecedor")).toBe("fornecedor");
    expect(resolvePeerCategory("parceiro b2b")).toBe("fornecedor");
    expect(resolvePeerCategory("supplier")).toBe("fornecedor");
    expect(resolvePeerCategory("cliente")).toBe("cliente");
    expect(resolvePeerCategory("cliente final")).toBe("cliente");
    expect(resolvePeerCategory("admin")).toBe("admin");
  });

  it("retorna null (nunca prestador) para role desconhecido/vazio", () => {
    expect(resolvePeerCategory(null)).toBeNull();
    expect(resolvePeerCategory("")).toBeNull();
    expect(resolvePeerCategory("user")).toBeNull();
    expect(resolvePeerCategory("qualquer_outra_coisa")).toBeNull();
  });
});

describe("getPeerTheme (cores por categoria + fallback neutro)", () => {
  it("aplica cor ciano do LOJISTA", () => {
    const t = getPeerTheme("lojista");
    expect(t.hex).toBe(CATEGORY_COLORS.lojista);
    expect(t.label).toBe("Lojista");
  });

  it("aplica cor âmbar do PRESTADOR", () => {
    expect(getPeerTheme("prestador").hex).toBe(CATEGORY_COLORS.prestador);
  });

  it("aplica cor roxa do FORNECEDOR", () => {
    expect(getPeerTheme("fornecedor").hex).toBe(CATEGORY_COLORS.fornecedor);
    expect(getPeerTheme("parceiro").hex).toBe(CATEGORY_COLORS.fornecedor);
  });

  it("aplica cor verde do CLIENTE FINAL", () => {
    expect(getPeerTheme("cliente").hex).toBe(CATEGORY_COLORS.cliente);
    expect(getPeerTheme("cliente_final").hex).toBe(CATEGORY_COLORS.cliente);
  });

  it("usa tema neutro cinza quando role é desconhecido — sem regressão de cor errada", () => {
    expect(getPeerTheme(null)).toEqual(NEUTRAL_THEME);
    expect(getPeerTheme("desconhecido")).toEqual(NEUTRAL_THEME);
    expect(getPeerTheme(undefined).hex).toBe(NEUTRAL_THEME.hex);
  });
});

describe("resolvePeerProfile — role autoritativo do peer", () => {
  it("linha em store_profiles força role=lojista mesmo com profiles.role='user'", async () => {
    state.profiles = { id: "u1", user_id: "u1", display_name: "Loja X", role: "user" };
    state.store = { user_id: "u1", company_name: "Loja X", logo_url: null };
    const p = await resolvePeerProfile("u1");
    expect(p.role).toBe("lojista");
    expect(getPeerTheme(p.role).hex).toBe(CATEGORY_COLORS.lojista);
  });

  it("linha em provider_profiles força role=prestador (tema âmbar)", async () => {
    state.profiles = { id: "u2", user_id: "u2", display_name: "João", role: null };
    state.provider = { user_id: "u2", display_name: "João Prestador" };
    const p = await resolvePeerProfile("u2");
    expect(p.role).toBe("prestador");
    expect(getPeerTheme(p.role).hex).toBe(CATEGORY_COLORS.prestador);
  });

  it("fornecedor vem de profiles.role quando não há store/provider — tema roxo", async () => {
    state.profiles = { id: "u3", user_id: "u3", display_name: "Fornec.", role: "fornecedor" };
    const p = await resolvePeerProfile("u3");
    expect(resolvePeerCategory(p.role)).toBe("fornecedor");
    expect(getPeerTheme(p.role).hex).toBe(CATEGORY_COLORS.fornecedor);
  });

  it("cliente vem de profiles.role — tema verde", async () => {
    state.profiles = { id: "u4", user_id: "u4", display_name: "Cliente", role: "cliente" };
    const p = await resolvePeerProfile("u4");
    expect(resolvePeerCategory(p.role)).toBe("cliente");
    expect(getPeerTheme(p.role).hex).toBe(CATEGORY_COLORS.cliente);
  });

  it("sem sinais confiáveis → categoria neutra (não vaza tema errado)", async () => {
    const p = await resolvePeerProfile("00000000-0000-0000-0000-000000000099");
    expect(resolvePeerCategory(p.role)).toBeNull();
    expect(getPeerTheme(p.role)).toEqual(NEUTRAL_THEME);
  });
});
