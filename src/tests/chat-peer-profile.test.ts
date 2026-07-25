import { describe, it, expect, vi, beforeEach } from "vitest";

const chain = (rows: any) => ({
  select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: rows, error: null }) }) }),
});

const state: { profiles: any; store: any; profilesByUser: any } = {
  profiles: null,
  profilesByUser: null,
  store: null,
};

vi.mock("@/lib/supabaseExternal", () => ({
  supabaseExternal: {
    from(table: string) {
      if (table === "profiles") {
        // Retorna primeiro por id, depois por user_id conforme chamadas subsequentes
        return {
          select: () => ({
            eq: (col: string) => ({
              maybeSingle: async () => ({
                data: col === "id" ? state.profiles : state.profilesByUser,
                error: null,
              }),
            }),
          }),
        };
      }
      if (table === "store_profiles") return chain(state.store);
      return chain(null);
    },
  },
}));

import { resolvePeerProfile, clearPeerCache, initialsOf } from "@/lib/chat-peer-profile";

beforeEach(() => {
  state.profiles = null;
  state.profilesByUser = null;
  state.store = null;
  clearPeerCache();
});

describe("chat-peer-profile", () => {
  it("returns fallback when nothing is found", async () => {
    const p = await resolvePeerProfile("00000000-0000-0000-0000-000000000001");
    expect(p.name).toBe("Conversa");
    expect(p.avatarUrl).toBeNull();
    expect(p.initials).toBe("?");
    expect(p.source).toContain("fallback");
  });

  it("prefers display_name from profiles by id", async () => {
    state.profiles = { id: "u1", user_id: "u1", display_name: "Ana Loja", avatar_url: "http://a.png", role: "lojista" };
    const p = await resolvePeerProfile("u1");
    expect(p.name).toBe("Ana Loja");
    expect(p.avatarUrl).toBe("http://a.png");
    expect(p.initials).toBe("AL");
  });

  it("falls back to profiles.user_id when id lookup empty", async () => {
    state.profilesByUser = { id: "x", user_id: "u2", full_name: "Bruno", avatar_url: null, role: null };
    const p = await resolvePeerProfile("u2");
    expect(p.name).toBe("Bruno");
    expect(p.source).toContain("profiles.user_id");
  });

  it("reads name/avatar from custom_sections.__extras when base fields empty", async () => {
    state.profiles = {
      id: "u3", user_id: "u3", display_name: null, full_name: null, avatar_url: null,
      custom_sections: { __extras: { display_name: "Extra User", photo_url: "http://x.png" } },
    };
    const p = await resolvePeerProfile("u3");
    expect(p.name).toBe("Extra User");
    expect(p.avatarUrl).toBe("http://x.png");
  });

  it("falls back to store_profiles when profiles missing name/avatar", async () => {
    state.profiles = { id: "u4", user_id: "u4", display_name: null, full_name: null, avatar_url: null };
    state.store = { company_name: "Loja Alpha", logo_url: "http://logo.png", display_name: null };
    const p = await resolvePeerProfile("u4");
    expect(p.name).toBe("Loja Alpha");
    expect(p.avatarUrl).toBe("http://logo.png");
    expect(p.source).toEqual(expect.arrayContaining(["store_profiles.name", "store_profiles.logo"]));
  });

  it("caches resolved profile for subsequent calls", async () => {
    state.profiles = { id: "u5", user_id: "u5", display_name: "Cache Me", avatar_url: null };
    const a = await resolvePeerProfile("u5");
    state.profiles = null; // Se re-consultasse, retornaria vazio.
    const b = await resolvePeerProfile("u5");
    expect(b.name).toBe(a.name);
  });

  it("initialsOf handles edge cases", () => {
    expect(initialsOf("")).toBe("?");
    expect(initialsOf("único")).toBe("Ú");
    expect(initialsOf("  maria clara silva ")).toBe("MC");
  });
});
