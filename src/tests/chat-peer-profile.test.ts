import { describe, it, expect, vi, beforeEach } from "vitest";

const chain = (rows: any) => ({
  select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: rows, error: null }) }) }),
});

const chainByColumn = (rows: Record<string, any>) => ({
  select: () => ({
    eq: (col: string) => ({ maybeSingle: async () => ({ data: rows[col] ?? null, error: null }) }),
  }),
});

const state: { publicProfile: any; publicProfileById: any; profiles: any; store: any; profilesByUser: any; provider: any } = {
  publicProfile: null,
  publicProfileById: null,
  profiles: null,
  profilesByUser: null,
  provider: null,
  store: null,
};

vi.mock("@/lib/supabaseExternal", () => ({
  supabaseExternal: {
    from(table: string) {
      if (table === "profiles_public") return chainByColumn({ user_id: state.publicProfile, id: state.publicProfileById });
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
      if (table === "provider_profiles") return chain(state.provider);
      if (table === "store_profiles") return chain(state.store);
      return chain(null);
    },
  },
}));

import { resolvePeerProfile, clearPeerCache, initialsOf } from "@/lib/chat-peer-profile";

beforeEach(() => {
  state.profiles = null;
  state.publicProfile = null;
  state.publicProfileById = null;
  state.profilesByUser = null;
  state.provider = null;
  state.store = null;
  clearPeerCache();
});

describe("chat-peer-profile", () => {
  it("prefers safe public profile data when direct profiles may be blocked by RLS", async () => {
    state.publicProfile = { id: "u0", user_id: "u0", display_name: "Nome Público", avatar_url: "http://public.png", role: "prestador" };
    state.profiles = null;
    const p = await resolvePeerProfile("u0");
    expect(p.name).toBe("Nome Público");
    expect(p.avatarUrl).toBe("http://public.png");
    expect(p.source).toContain("profiles_public.user_id");
  });

  it("prioritizes profiles_public.user_id over a row id match to avoid wrong peer data", async () => {
    state.publicProfile = { id: "row-a", user_id: "u-correto", display_name: "Peer Correto", avatar_url: "http://right.png" };
    state.publicProfileById = { id: "u-correto", user_id: "outro-dono", display_name: "Perfil Errado", avatar_url: "http://wrong.png" };
    const p = await resolvePeerProfile("u-correto");
    expect(p.name).toBe("Peer Correto");
    expect(p.avatarUrl).toBe("http://right.png");
    expect(p.source).toContain("profiles_public.user_id");
  });

  it("returns fallback when nothing is found", async () => {
    const p = await resolvePeerProfile("00000000-0000-0000-0000-000000000001");
    expect(p.name).toBe("Conversa");
    expect(p.avatarUrl).toBeNull();
    expect(p.initials).toBe("C");
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
    expect(p.source).toEqual(expect.arrayContaining(["store_profiles.user_id.name", "store_profiles.user_id.avatar"]));
  });

  it("falls back to provider_profiles for service provider avatar and name", async () => {
    state.profiles = { id: "u6", user_id: "u6", display_name: null, full_name: null, avatar_url: null };
    state.provider = { user_id: "u6", display_name: "Prestador Real", photo_url: "http://provider.png", role: "prestador" };
    const p = await resolvePeerProfile("u6");
    expect(p.name).toBe("Prestador Real");
    expect(p.avatarUrl).toBe("http://provider.png");
    expect(p.source).toEqual(expect.arrayContaining(["provider_profiles.user_id.name", "provider_profiles.user_id.avatar"]));
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
