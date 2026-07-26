/**
 * FIXXER — Recalcula tema/tag para mensagens JÁ existentes no chat.
 *
 * Simula um histórico com peers de todas as categorias e confirma que a
 * nova lógica centralizada devolve a cor/tag oficial para cada mensagem,
 * sem depender de nada previamente cacheado por render antigo.
 *
 * Também verifica que perfil público e chat compartilham cache — a segunda
 * consulta do mesmo userId não bate no Supabase de novo (dedup + TTL).
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { CATEGORY_COLORS, getPeerTheme, resolvePeerCategory } from "@/lib/category-colors";

type PeerState = {
  profiles?: any;
  provider_profiles?: any;
  store_profiles?: any;
  supplier_profiles?: any;
};

// Mock supabase — conta hits por (tabela+coluna+userId) para provar dedup.
const rowsByPeer: Record<string, PeerState> = {};
let queryCount = 0;

function chain(table: keyof PeerState) {
  return {
    select: () => ({
      eq: (_col: string, value: string) => ({
        limit: () => ({
          maybeSingle: async () => {
            queryCount++;
            return { data: rowsByPeer[value]?.[table] ?? null, error: null };
          },
        }),
        maybeSingle: async () => {
          queryCount++;
          return { data: rowsByPeer[value]?.[table] ?? null, error: null };
        },
      }),
    }),
  };
}

vi.mock("@/lib/supabaseExternal", () => ({
  supabaseExternal: {
    from(table: string) {
      if (table === "profiles_public") return chain("profiles"); // mesma linha
      if (table === "profiles") return chain("profiles");
      if (table === "provider_profiles") return chain("provider_profiles");
      if (table === "store_profiles") return chain("store_profiles");
      if (table === "supplier_profiles") return chain("supplier_profiles");
      return chain("profiles");
    },
  },
}));

import { resolvePeerProfile, clearPeerCache } from "@/lib/chat-peer-profile";
import {
  resolvePublicProfileCategory,
  clearPublicProfileCategoryCache,
} from "@/lib/public-profile-category";

beforeEach(() => {
  for (const k of Object.keys(rowsByPeer)) delete rowsByPeer[k];
  queryCount = 0;
  clearPeerCache();
  clearPublicProfileCategoryCache();
});

/* ------------------------------------------------------------------ */
/* Histórico já existente: recalcula cor/tag por mensagem              */
/* ------------------------------------------------------------------ */
describe("mensagens existentes — nova lógica recalcula cor/tag", () => {
  it("bolhas recebidas de peers de 4 categorias herdam tema oficial", async () => {
    // Popula os "usuários que já mandaram mensagem" com dados reais.
    rowsByPeer["peer-lojista"] = {
      profiles: { user_id: "peer-lojista", display_name: "Loja X", role: "user" },
      store_profiles: { user_id: "peer-lojista", company_name: "Loja X" },
    };
    rowsByPeer["peer-prestador"] = {
      profiles: { user_id: "peer-prestador", display_name: "João", role: null },
      provider_profiles: { user_id: "peer-prestador", display_name: "João Prestador" },
    };
    rowsByPeer["peer-fornec"] = {
      profiles: { user_id: "peer-fornec", display_name: "Fornec.", role: "user" },
      supplier_profiles: { user_id: "peer-fornec", company_name: "Fornec." },
    };
    rowsByPeer["peer-cliente"] = {
      profiles: { user_id: "peer-cliente", display_name: "Cliente", role: "cliente" },
    };

    // Simula histórico já persistido (várias mensagens do mesmo peer)
    const history = [
      { id: "m1", sender_id: "peer-lojista", content: "olá" },
      { id: "m2", sender_id: "peer-prestador", content: "posso ajudar?" },
      { id: "m3", sender_id: "peer-lojista", content: "combinado" },
      { id: "m4", sender_id: "peer-fornec", content: "temos em estoque" },
      { id: "m5", sender_id: "peer-cliente", content: "quero contratar" },
      { id: "m6", sender_id: "peer-prestador", content: "ok" },
    ];

    const expected: Record<string, keyof typeof CATEGORY_COLORS> = {
      "peer-lojista": "lojista",
      "peer-prestador": "prestador",
      "peer-fornec": "fornecedor",
      "peer-cliente": "cliente",
    };

    for (const msg of history) {
      const peer = await resolvePeerProfile(msg.sender_id);
      const expectedCat = expected[msg.sender_id];
      const cat = resolvePeerCategory(peer.role);
      expect(cat, `msg ${msg.id} (${msg.sender_id})`).toBe(expectedCat);
      const theme = getPeerTheme(peer.role);
      expect(theme.hex).toBe(CATEGORY_COLORS[expectedCat]);
      // A tag exibida na bolha usa theme.label — precisa bater com a categoria oficial.
      expect(theme.label.toLowerCase()).toContain(
        expectedCat === "fornecedor" ? "fornecedor" : expectedCat,
      );
    }
  });

  it("mensagem antiga cujo profiles.role='user' é reclassificada via tabela especializada", async () => {
    // Cadastro antigo em que role ficou genérico — a nova lógica NÃO deve
    // mais tratar como "cliente" (mapeamento removido).
    rowsByPeer["peer-antigo"] = {
      profiles: { user_id: "peer-antigo", display_name: "Antigo", role: "user" },
      provider_profiles: { user_id: "peer-antigo" }, // fonte autoritativa
    };
    const peer = await resolvePeerProfile("peer-antigo");
    expect(resolvePeerCategory(peer.role)).toBe("prestador");
    expect(getPeerTheme(peer.role).hex).toBe(CATEGORY_COLORS.prestador);
  });
});

/* ------------------------------------------------------------------ */
/* Cache compartilhado — chat + perfil público não duplicam consultas  */
/* ------------------------------------------------------------------ */
describe("cache compartilhado entre chat e perfil público", () => {
  it("chat prima o cache; perfil público subsequente responde sem novas queries", async () => {
    rowsByPeer["u-shared"] = {
      profiles: { user_id: "u-shared", display_name: "Ana", role: "user" },
      store_profiles: { user_id: "u-shared", company_name: "Loja Ana" },
    };

    await resolvePeerProfile("u-shared");
    const afterChat = queryCount;
    expect(afterChat).toBeGreaterThan(0);

    // Perfil público em seguida — deve responder do cache primado pelo chat.
    const cat = await resolvePublicProfileCategory("u-shared");
    expect(cat).toBe("lojista");
    expect(queryCount).toBe(afterChat); // ZERO queries adicionais
  });

  it("chamadas concorrentes do mesmo userId disparam UMA consulta (dedup inflight)", async () => {
    rowsByPeer["u-race"] = {
      supplier_profiles: { user_id: "u-race" },
    };
    const [a, b, c] = await Promise.all([
      resolvePublicProfileCategory("u-race"),
      resolvePublicProfileCategory("u-race"),
      resolvePublicProfileCategory("u-race"),
    ]);
    expect([a, b, c]).toEqual(["fornecedor", "fornecedor", "fornecedor"]);
    // A dedup só permite um pipeline de consultas — sem ela seriam 3× as queries.
    // (Aceita margem: 1 pipeline pode fazer múltiplas queries até achar a fonte,
    // mas o total DEVE ser bem menor que 3× esse pipeline.)
    const single = queryCount;
    clearPublicProfileCategoryCache();
    await resolvePublicProfileCategory("u-race");
    const another = queryCount - single;
    expect(single).toBeLessThanOrEqual(another * 1.5);
  });

  it("refresh:true ignora cache e reconsulta", async () => {
    rowsByPeer["u-refresh"] = { store_profiles: { user_id: "u-refresh" } };
    await resolvePublicProfileCategory("u-refresh");
    const first = queryCount;
    await resolvePublicProfileCategory("u-refresh"); // cache hit
    expect(queryCount).toBe(first);
    await resolvePublicProfileCategory("u-refresh", { refresh: true });
    expect(queryCount).toBeGreaterThan(first);
  });
});
