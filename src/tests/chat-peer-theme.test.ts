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

vi.mock("@/lib/public-profile-category", () => {
  return {
    resolvePublicProfileCategory: vi.fn(async (userId: string, options?: any) => {
      if (state.store && (state.store.user_id === userId || userId === "u1")) return "lojista";
      if (state.provider && (state.provider.user_id === userId || userId === "u2")) return "prestador";
      if (options?.profile?.role === "fornecedor" || (state.profiles?.role === "fornecedor" && userId === "u3")) return "fornecedor";
      if (options?.profile?.role === "cliente" || (state.profiles?.role === "cliente" && userId === "u4")) return "cliente";
      return null;
    }),
    primePublicProfileCategory: vi.fn(),
    clearPublicProfileCategoryCache: vi.fn(),
    peekPublicProfileCategory: vi.fn(),
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
});
