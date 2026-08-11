/**
 * FIXXER — Testes E2E (nível de contrato) do tema por categoria no chat.
 *
 * Cobre o fluxo "abrir conversa com peerId X" reproduzindo exatamente os mesmos
 * estilos inline aplicados pelos componentes de chat:
 *   - Cabeçalho da sala (avatar border + badge da tag)
 *   - Item da lista de conversas (avatar/borda + chip do role)
 *   - Bolha de mensagem recebida (borderColor rgba(...,0.35))
 *
 * Também valida contraste WCAG contra o fundo escuro do chat (#0A0A0B):
 *   - texto colorido do tema (hex) ≥ 4.5:1 (AA texto normal)
 *   - borda/preenchimento de badge (grande área) ≥ 3:1
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  CATEGORY_COLORS,
  NEUTRAL_THEME,
  getPeerTheme,
  resolvePeerCategory,
  type CategoryKey,
} from "@/lib/category-colors";

// Reaproveita o mock da store/provider/profiles usada pelo resolvedor real.
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
      if (state.store && (state.store.user_id === userId || userId === "peer-lojista-uuid")) return "lojista";
      if (state.provider && (state.provider.user_id === userId || userId === "peer-prestador-uuid")) return "prestador";
      if (options?.profile?.role === "fornecedor" || (state.profiles?.role === "fornecedor" && userId === "peer-fornec-uuid")) return "fornecedor";
      if (options?.profile?.role === "cliente" || (state.profiles?.role === "cliente" && userId === "peer-cliente-uuid")) return "cliente";
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
});

/* ------------------------------------------------------------------ */
/* Helpers de contraste WCAG 2.1 (relative luminance)                 */
/* ------------------------------------------------------------------ */
function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}
function relLuminance([r, g, b]: [number, number, number]): number {
  const conv = (c: number) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * conv(r) + 0.7152 * conv(g) + 0.0722 * conv(b);
}
function contrastRatio(fgHex: string, bgHex: string): number {
  const L1 = relLuminance(hexToRgb(fgHex));
  const L2 = relLuminance(hexToRgb(bgHex));
  const [hi, lo] = L1 >= L2 ? [L1, L2] : [L2, L1];
  return (hi + 0.05) / (lo + 0.05);
}

// Fundo real do chat (bg-black / dark theme): usamos o valor mais escuro
// entre a bolha (#0A0A0B) e a superfície do header (#111114).
const CHAT_BG = "#0A0A0B";

/* ------------------------------------------------------------------ */
/* Reprodução literal dos estilos inline usados no chat.              */
/* Se o código do chat mudar, esses helpers precisam mudar junto —    */
/* é justamente essa amarração que garante um teste E2E de contrato.  */
/* ------------------------------------------------------------------ */
function headerStyles(role: string | null) {
  const t = getPeerTheme(role);
  return {
    // src/routes/_authenticated.chat.$peerId.tsx:1236 (borda do container)
    containerBorder: `rgba(${t.rgb}, 0.35)`,
    // :1256 avatar border + glow
    avatarBorder: t.hex,
    avatarGlow: `0 0 12px rgba(${t.rgb}, 0.45)`,
    // :1283-1285 badge da tag
    badgeBg: `rgba(${t.rgb}, 0.15)`,
    badgeColor: t.hex,
    badgeLabel: t.label,
  };
}
function listItemStyles(role: string | null) {
  const t = getPeerTheme(role);
  // src/routes/_authenticated.chat.tsx linha ~869 → getPeerTheme(c.peerRole)
  return { avatarColor: t.hex, chipBg: `rgba(${t.rgb}, 0.15)` };
}
function bubbleStyles(role: string | null) {
  const t = getPeerTheme(role);
  // :1462 → borderColor rgba(rgb, 0.35) para bolhas recebidas
  return { borderColor: `rgba(${t.rgb}, 0.35)` };
}

/* ------------------------------------------------------------------ */
/* Fixtures — "abre conversa com peer X" para cada categoria          */
/* ------------------------------------------------------------------ */
const OPEN_CONVERSATIONS: Array<{
  label: string;
  peerId: string;
  setup: () => void;
  expected: CategoryKey;
}> = [
  {
    label: "LOJISTA (ciano)",
    peerId: "u1",
    setup: () => {
      state.profiles = { user_id: "u1", display_name: "Loja X", role: "user" };
      state.store = { user_id: "u1", company_name: "Loja X" };
    },
    expected: "lojista",
  },
  {
    label: "PRESTADOR (âmbar)",
    peerId: "u2",
    setup: () => {
      state.profiles = { user_id: "u2", display_name: "João", role: null };
      state.provider = { user_id: "u2", display_name: "João Prestador" };
    },
    expected: "prestador",
  },
  {
    label: "FORNECEDOR (roxo)",
    peerId: "u3",
    setup: () => {
      state.profiles = { user_id: "u3", display_name: "Fornec.", role: "fornecedor" };
    },
    expected: "fornecedor",
  },
  {
    label: "CLIENTE FINAL (verde)",
    peerId: "u4",
    setup: () => {
      state.profiles = { user_id: "u4", display_name: "Cliente", role: "cliente" };
    },
    expected: "cliente",
  },
];

/* ================================================================== */
describe("E2E chat — cabeçalho, lista e bolha herdam tema do peer", () => {
  for (const fx of OPEN_CONVERSATIONS) {
    it(`${fx.label}: header + item + bolha usam a cor oficial`, async () => {
      fx.setup();
      const peer = await resolvePeerProfile(fx.peerId);
      const cat = resolvePeerCategory(peer.role);
      expect(cat, `role resolvido: ${peer.role}`).toBe(fx.expected);

      const expectedHex = CATEGORY_COLORS[fx.expected];
      const t = getPeerTheme(peer.role);
      expect(t.hex).toBe(expectedHex);

      // Cabeçalho da sala
      const h = headerStyles(peer.role);
      expect(h.avatarBorder).toBe(expectedHex);
      expect(h.badgeColor).toBe(expectedHex);
      expect(h.badgeBg).toContain("rgba(");
      expect(h.containerBorder).toMatch(/rgba\(\d+, \d+, \d+, 0\.35\)/);
      expect(h.badgeLabel).toBe(t.label);

      // Item da lista de conversas
      const li = listItemStyles(peer.role);
      expect(li.avatarColor).toBe(expectedHex);
      expect(li.chipBg).toContain(t.rgb);

      // Bolha de mensagem recebida
      const b = bubbleStyles(peer.role);
      expect(b.borderColor).toBe(`rgba(${t.rgb}, 0.35)`);
    });
  }

  it("peer sem categoria confiável → tema neutro (cinza) em header/lista/bolha", async () => {
    const peer = await resolvePeerProfile("00000000-0000-0000-0000-0000000000ff");
    expect(resolvePeerCategory(peer.role)).toBeNull();
    const h = headerStyles(peer.role);
    const li = listItemStyles(peer.role);
    const b = bubbleStyles(peer.role);
    expect(h.avatarBorder).toBe(NEUTRAL_THEME.hex);
    expect(li.avatarColor).toBe(NEUTRAL_THEME.hex);
    expect(b.borderColor).toBe(`rgba(${NEUTRAL_THEME.rgb}, 0.35)`);
  });
});

/* ================================================================== */
describe("A11y — contraste WCAG dos temas contra o fundo do chat", () => {
  const AA_NORMAL = 4.5; // texto normal
  const AA_LARGE_OR_UI = 3.0; // ícone/borda/badge (large text & UI components)

  for (const cat of ["lojista", "prestador", "fornecedor", "cliente"] as CategoryKey[]) {
    it(`${cat}: texto colorido tem contraste ≥ ${AA_NORMAL}:1 contra ${CHAT_BG}`, () => {
      const ratio = contrastRatio(CATEGORY_COLORS[cat], CHAT_BG);
      expect(ratio, `contraste calculado: ${ratio.toFixed(2)}:1`).toBeGreaterThanOrEqual(AA_NORMAL);
    });

    it(`${cat}: borda/badge (área grande) tem contraste ≥ ${AA_LARGE_OR_UI}:1`, () => {
      const ratio = contrastRatio(CATEGORY_COLORS[cat], CHAT_BG);
      expect(ratio).toBeGreaterThanOrEqual(AA_LARGE_OR_UI);
    });
  }

  it("tema neutro (fallback cinza) mantém legibilidade mínima (≥ 3:1) para UI", () => {
    const ratio = contrastRatio(NEUTRAL_THEME.hex, CHAT_BG);
    expect(ratio).toBeGreaterThanOrEqual(3.0);
  });

  it("sanidade do cálculo: branco/preto → 21:1; mesma cor → 1:1", () => {
    expect(contrastRatio("#FFFFFF", "#000000")).toBeCloseTo(21, 0);
    expect(contrastRatio("#123456", "#123456")).toBeCloseTo(1, 5);
  });
});
