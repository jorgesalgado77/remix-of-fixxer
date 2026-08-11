import { describe, it, expect, vi, beforeEach } from "vitest";

// Estado compartilhado encapsulado
const testState = {
  profiles: {} as Record<string, any>,
  publicProfiles: {} as Record<string, any>
};

vi.mock("@/lib/supabaseExternal", () => ({
  supabaseExternal: {
    from: vi.fn((table: string) => ({
      select: vi.fn((query?: string) => ({
        eq: vi.fn((col: string, val: any) => ({
          maybeSingle: vi.fn(async () => {
            if (table === "profiles") {
              // Simula busca por id ou user_id
              const found = Object.values(testState.profiles).find(p => p[col] === val);
              if (found) return { data: found, error: null };
            }
            if (table === "profiles_public") {
              const found = Object.values(testState.publicProfiles).find(p => p[col] === val);
              if (found) return { data: found, error: null };
            }
            return { data: null, error: null };
          })
        }))
      }))
    }))
  },
}));

vi.mock("@/lib/public-profile-category", () => ({
  resolvePublicProfileCategory: vi.fn(async (userId: string) => {
    const p = Object.values(testState.profiles).find(x => x.id === userId || x.user_id === userId) ||
              Object.values(testState.publicProfiles).find(x => x.id === userId || x.user_id === userId);
    return p?.role || "cliente";
  }),
  primePublicProfileCategory: vi.fn(),
  clearPublicProfileCategoryCache: vi.fn(),
  peekPublicProfileCategory: vi.fn(),
}));

import { resolvePeerProfile, clearPeerCache, initialsOf } from "@/lib/chat-peer-profile";

beforeEach(() => {
  testState.profiles = {};
  testState.publicProfiles = {};
  clearPeerCache();
  vi.clearAllMocks();
});

describe("chat-peer-profile", () => {
  it("prefers safe public profile data when direct profiles may be blocked by RLS", async () => {
    testState.publicProfiles["u0"] = { 
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
    testState.profiles["u1"] = { 
      id: "u1", user_id: "u1", display_name: "Ana Loja", avatar_url: "http://a.png", role: "lojista" 
    };
    
    const p = await resolvePeerProfile("u1");
    expect(p.name).toBe("Ana Loja");
  });

  it("refresh option bypasses cache to load latest display name/avatar", async () => {
    testState.profiles["u7"] = { 
      id: "u7", user_id: "u7", display_name: "Nome Antigo" 
    };
    
    const a = await resolvePeerProfile("u7");
    expect(a.name).toBe("Nome Antigo");

    testState.profiles["u7"] = { 
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
