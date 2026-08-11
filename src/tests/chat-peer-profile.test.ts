import { describe, it, expect, vi, beforeEach } from "vitest";

const chain = (rows: any) => ({
  select: () => ({ 
    eq: () => ({ 
      maybeSingle: async () => ({ data: rows, error: null }) 
    }) 
  }),
});

const chainByColumn = (rows: Record<string, any>) => ({
  select: (query?: string) => ({
    eq: (col: string) => ({ 
      maybeSingle: async () => ({ data: rows[col] ?? null, error: null }) 
    }),
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
        return {
          select: (query?: string) => ({
            eq: (col: string) => ({
              maybeSingle: async () => {
                const data = col === "id" ? state.profiles : state.profilesByUser;
                return { data, error: null };
              },
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

vi.mock("@/lib/public-profile-category", () => {
  return {
    resolvePublicProfileCategory: vi.fn(async (userId: string, options?: any) => {
      if (state.store && (state.store.user_id === userId || userId === "u1")) return "lojista";
      if (state.provider && (state.provider.user_id === userId || userId === "u2")) return "prestador";
      if (options?.profile?.role === "fornecedor" || (state.profiles?.role === "fornecedor" && userId === "u3")) return "fornecedor";
      if (options?.profile?.role === "cliente" || (state.profiles?.role === "cliente" && userId === "u4")) return "cliente";
      if (options?.profile?.role === "prestador" || (state.publicProfile?.role === "prestador" && userId === "u0")) return "prestador";
      return "cliente";
    }),
    primePublicProfileCategory: vi.fn(),
    clearPublicProfileCategoryCache: vi.fn(),
    peekPublicProfileCategory: vi.fn(),
  };
});

import { resolvePeerProfile, clearPeerCache, initialsOf } from "@/lib/chat-peer-profile";

beforeEach(() => {
  state.profiles = null;
  state.publicProfile = null;
  state.publicProfileById = null;
  state.profilesByUser = null;
  state.provider = null;
  state.store = null;
  clearPeerCache();
  vi.clearAllMocks();
});

describe("chat-peer-profile", () => {
  it("prefers safe public profile data when direct profiles may be blocked by RLS", async () => {
    state.publicProfile = { id: "u0", user_id: "u0", display_name: "Nome Público", avatar_url: "http://public.png", role: "prestador" };
    state.profiles = null;
    const p = await resolvePeerProfile("u0");
    expect(p.name).toBe("Nome Público");
    expect(p.avatarUrl).toBe("http://public.png");
  });

  it("returns fallback when nothing is found", async () => {
    const p = await resolvePeerProfile("empty-user");
    expect(p.name).toBe("Conversa");
  });

  it("prefers display_name from profiles by id", async () => {
    state.profiles = { id: "u1", user_id: "u1", display_name: "Ana Loja", avatar_url: "http://a.png", role: "lojista" };
    const p = await resolvePeerProfile("u1");
    expect(p.name).toBe("Ana Loja");
    expect(p.avatarUrl).toBe("http://a.png");
  });

  it("refresh option bypasses cache to load latest display name/avatar", async () => {
    state.profilesByUser = { id: "u7", user_id: "u7", display_name: "Nome Antigo" };
    const a = await resolvePeerProfile("u7");
    expect(a.name).toBe("Nome Antigo");

    state.profilesByUser = { id: "u7", user_id: "u7", display_name: "Nome Novo" };
    const refreshed = await resolvePeerProfile("u7", { refresh: true });
    expect(refreshed.name).toBe("Nome Novo");
  });

  it("initialsOf handles edge cases", () => {
    expect(initialsOf("")).toBe("?");
    expect(initialsOf("único")).toBe("Ú");
    expect(initialsOf("  maria clara silva ")).toBe("MC");
  });
});
