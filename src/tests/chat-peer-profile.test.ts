import { describe, it, expect, vi, beforeEach } from "vitest";

const chain = (rows: any) => ({
  select: () => ({ 
    eq: () => ({ 
      maybeSingle: async () => ({ data: rows, error: null }) 
    }) 
  }),
});

// Mock da Supabase que simula o comportamento real do data fetching
vi.mock("@/lib/supabaseExternal", () => ({
  supabaseExternal: {
    from: vi.fn((table: string) => {
      return {
        select: vi.fn((query?: string) => ({
          eq: vi.fn((col: string, val: any) => ({
            maybeSingle: vi.fn(async () => {
              if (table === "profiles") {
                // Simula busca por id ou user_id
                if ((col === "id" || col === "user_id") && global.__TEST_STATE__.profiles?.[val]) {
                  return { data: global.__TEST_STATE__.profiles[val], error: null };
                }
              }
              if (table === "profiles_public") {
                if ((col === "user_id" || col === "id") && global.__TEST_STATE__.publicProfiles?.[val]) {
                  return { data: global.__TEST_STATE__.publicProfiles[val], error: null };
                }
              }
              return { data: null, error: null };
            })
          }))
        }))
      };
    }),
  },
}));

vi.mock("@/lib/public-profile-category", () => {
  return {
    resolvePublicProfileCategory: vi.fn(async (userId: string) => {
      const p = global.__TEST_STATE__.profiles?.[userId] || global.__TEST_STATE__.publicProfiles?.[userId];
      return p?.role || "cliente";
    }),
    primePublicProfileCategory: vi.fn(),
    clearPublicProfileCategoryCache: vi.fn(),
    peekPublicProfileCategory: vi.fn(),
  };
});

import { resolvePeerProfile, clearPeerCache, initialsOf } from "@/lib/chat-peer-profile";

// Estado global para os mocks
(global as any).__TEST_STATE__ = {
  profiles: {},
  publicProfiles: {}
};

beforeEach(() => {
  global.__TEST_STATE__.profiles = {};
  global.__TEST_STATE__.publicProfiles = {};
  clearPeerCache();
  vi.clearAllMocks();
});

describe("chat-peer-profile", () => {
  it("prefers safe public profile data when direct profiles may be blocked by RLS", async () => {
    global.__TEST_STATE__.publicProfiles["u0"] = { 
      id: "u0", user_id: "u0", display_name: "Nome Público", avatar_url: "http://public.png", role: "prestador" 
    };
    
    const p = await resolvePeerProfile("u0");
    expect(p.name).toBe("Nome Público");
    expect(p.avatarUrl).toBe("http://public.png");
  });

  it("returns fallback when nothing is found", async () => {
    const p = await resolvePeerProfile("non-existent");
    expect(p.name).toBe("Conversa");
  });

  it("prefers display_name from profiles by id", async () => {
    global.__TEST_STATE__.profiles["u1"] = { 
      id: "u1", user_id: "u1", display_name: "Ana Loja", avatar_url: "http://a.png", role: "lojista" 
    };
    
    const p = await resolvePeerProfile("u1");
    expect(p.name).toBe("Ana Loja");
  });

  it("refresh option bypasses cache to load latest display name/avatar", async () => {
    global.__TEST_STATE__.profiles["u7"] = { 
      id: "u7", user_id: "u7", display_name: "Nome Antigo" 
    };
    
    const a = await resolvePeerProfile("u7");
    expect(a.name).toBe("Nome Antigo");

    // Atualiza o estado simulado do banco
    global.__TEST_STATE__.profiles["u7"] = { 
      id: "u7", user_id: "u7", display_name: "Nome Novo" 
    };
    
    const refreshed = await resolvePeerProfile("u7", { refresh: true });
    expect(refreshed.name).toBe("Nome Novo");
  });

  it("initialsOf handles edge cases", () => {
    expect(initialsOf("")).toBe("?");
    expect(initialsOf("único")).toBe("Ú");
    expect(initialsOf("  maria clara silva ")).toBe("MC");
  });
});
