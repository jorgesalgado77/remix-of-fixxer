/**
 * FIXXER — Testes de resolução centralizada de categoria.
 *
 * Garante que a mesma lógica alimenta perfil público e chat, e que as
 * rotas /lojista, /prestador, /parceiro e /cliente retornam as cores
 * oficiais (ciano / âmbar / roxo / verde) em ambos os contextos.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { CATEGORY_COLORS, getPeerTheme, resolvePeerCategory } from "@/lib/category-colors";

// Mock supabaseExternal — permite controlar respostas por tabela/coluna.
const state: {
  profiles_public: any;
  profiles: any;
  provider_profiles: any;
  store_profiles: any;
  supplier_profiles: any;
} = {
  profiles_public: null,
  profiles: null,
  provider_profiles: null,
  store_profiles: null,
  supplier_profiles: null,
};

function chain(rowsFor: keyof typeof state) {
  return {
    select: () => ({
      eq: () => ({
        limit: () => ({ maybeSingle: async () => ({ data: state[rowsFor], error: null }) }),
        maybeSingle: async () => ({ data: state[rowsFor], error: null }),
      }),
    }),
  };
}

vi.mock("@/lib/supabaseExternal", () => ({
  supabaseExternal: {
    from(table: string) {
      if (table === "profiles_public") return chain("profiles_public");
      if (table === "profiles") return chain("profiles");
      if (table === "provider_profiles") return chain("provider_profiles");
      if (table === "store_profiles") return chain("store_profiles");
      if (table === "supplier_profiles") return chain("supplier_profiles");
      return chain("profiles_public");
    },
  },
}));

import {
  categoryFromProfilePath,
  categoryFromRoleText,
  categoryFromRow,
  publicProfilePathFor,
  resolvePublicProfileCategory,
} from "@/lib/public-profile-category";
import { resolvePeerProfile, clearPeerCache } from "@/lib/chat-peer-profile";

beforeEach(() => {
  state.profiles_public = null;
  state.profiles = null;
  state.provider_profiles = null;
  state.store_profiles = null;
  state.supplier_profiles = null;
  clearPeerCache();
});

/* ------------------------------------------------------------------ */
/* Rotas → categoria (base do perfil público)                          */
/* ------------------------------------------------------------------ */
describe("categoryFromProfilePath: rotas oficiais → cor esperada", () => {
  const cases: Array<[string, keyof typeof CATEGORY_COLORS]> = [
    ["/lojista/abc", "lojista"],
    ["/prestador/abc", "prestador"],
    ["/parceiro/abc", "fornecedor"],
    ["/fornecedor/abc", "fornecedor"],
    ["/cliente/abc", "cliente"],
  ];
  for (const [path, expected] of cases) {
    it(`${path} → ${expected} (${CATEGORY_COLORS[expected]})`, () => {
      const cat = categoryFromProfilePath(path);
      expect(cat).toBe(expected);
      expect(getPeerTheme(cat).hex).toBe(CATEGORY_COLORS[expected]);
    });
  }

  it("publicProfilePathFor é inverso de categoryFromProfilePath", () => {
    for (const cat of ["lojista", "prestador", "fornecedor", "cliente"] as const) {
      const path = publicProfilePathFor(cat, "user-1");
      expect(categoryFromProfilePath(path)).toBe(cat);
    }
  });
});

/* ------------------------------------------------------------------ */
/* Sem mais fallback "user" → cliente                                  */
/* ------------------------------------------------------------------ */
describe("categoryFromRoleText: fallback genérico removido", () => {
  it("role='user' não é mais mapeado para cliente", () => {
    expect(categoryFromRoleText("user")).toBeNull();
    expect(categoryFromRoleText("usuario")).toBeNull();
    expect(categoryFromRoleText("usuário")).toBeNull();
  });

  it("mantém mapeamento explícito para as 4 categorias", () => {
    expect(categoryFromRoleText("lojista")).toBe("lojista");
    expect(categoryFromRoleText("prestador de serviço")).toBe("prestador");
    expect(categoryFromRoleText("fornecedor B2B")).toBe("fornecedor");
    expect(categoryFromRoleText("cliente final")).toBe("cliente");
  });

  it("categoryFromRow lê role de custom_sections.__extras", () => {
    expect(categoryFromRow({ role: "user", custom_sections: { __extras: { role: "prestador" } } })).toBe("prestador");
    // "user" isolado sem sinal confiável → null (não mais "cliente")
    expect(categoryFromRow({ role: "user" })).toBeNull();
  });
});

/* ------------------------------------------------------------------ */
/* Resolver central: tabelas especializadas > profiles.role            */
/* ------------------------------------------------------------------ */
describe("resolvePublicProfileCategory: fonte autoritativa unificada", () => {
  it("provider_profiles vence role='user' → prestador (âmbar)", async () => {
    state.provider_profiles = { user_id: "u1" };
    state.profiles = { user_id: "u1", role: "user" };
    const cat = await resolvePublicProfileCategory("u1");
    expect(cat).toBe("prestador");
    expect(getPeerTheme(cat).hex).toBe(CATEGORY_COLORS.prestador);
  });

  it("supplier_profiles vence profiles.role vazio → fornecedor (roxo)", async () => {
    state.supplier_profiles = { user_id: "u2" };
    const cat = await resolvePublicProfileCategory("u2");
    expect(cat).toBe("fornecedor");
    expect(getPeerTheme(cat).hex).toBe(CATEGORY_COLORS.fornecedor);
  });

  it("store_profiles → lojista (ciano)", async () => {
    state.store_profiles = { user_id: "u3" };
    const cat = await resolvePublicProfileCategory("u3");
    expect(cat).toBe("lojista");
    expect(getPeerTheme(cat).hex).toBe(CATEGORY_COLORS.lojista);
  });

  it("routeHint é usado quando nada mais é confiável (evita default cego)", async () => {
    const cat = await resolvePublicProfileCategory("u-desconhecido", { routeHint: "prestador" });
    expect(cat).toBe("prestador");
  });
});

/* ------------------------------------------------------------------ */
/* Chat: cor/tag vêm SEMPRE do peer, nunca do usuário logado           */
/* ------------------------------------------------------------------ */
describe("resolvePeerProfile: role autoritativo herda das tabelas especializadas", () => {
  it("peer com linha em supplier_profiles → role='fornecedor' (roxo)", async () => {
    state.profiles = { user_id: "p1", display_name: "Fornec.", role: "user" };
    state.supplier_profiles = { user_id: "p1", company_name: "Fornec." };
    const peer = await resolvePeerProfile("p1");
    expect(resolvePeerCategory(peer.role)).toBe("fornecedor");
    expect(getPeerTheme(peer.role).hex).toBe(CATEGORY_COLORS.fornecedor);
  });

  it("peer com linha em store_profiles + role='user' no profiles → lojista (ciano)", async () => {
    state.profiles = { user_id: "p2", display_name: "Loja X", role: "user" };
    state.store_profiles = { user_id: "p2", company_name: "Loja X" };
    const peer = await resolvePeerProfile("p2");
    expect(resolvePeerCategory(peer.role)).toBe("lojista");
    expect(getPeerTheme(peer.role).hex).toBe(CATEGORY_COLORS.lojista);
  });

  it("peer com linha em provider_profiles → prestador (âmbar)", async () => {
    state.profiles = { user_id: "p3", display_name: "João", role: null };
    state.provider_profiles = { user_id: "p3", display_name: "João Prestador" };
    const peer = await resolvePeerProfile("p3");
    expect(resolvePeerCategory(peer.role)).toBe("prestador");
    expect(getPeerTheme(peer.role).hex).toBe(CATEGORY_COLORS.prestador);
  });

  it("peer só em profiles com role='cliente' → cliente (verde)", async () => {
    state.profiles = { user_id: "p4", display_name: "Cliente", role: "cliente" };
    const peer = await resolvePeerProfile("p4");
    expect(resolvePeerCategory(peer.role)).toBe("cliente");
    expect(getPeerTheme(peer.role).hex).toBe(CATEGORY_COLORS.cliente);
  });
});
