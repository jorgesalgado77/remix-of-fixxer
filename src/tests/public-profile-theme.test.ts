/**
 * FIXXER — Teste de regressão: cor por categoria no perfil público.
 *
 * Reproduz o cálculo que o `LojistaPublicProfilePage` faz no PRIMEIRO
 * render para "seedar" seu tema visual:
 *
 *    initialCategory = peekPublicProfileCategory(userId)
 *                    ?? categoryFromProfilePath(pathname)
 *                    ?? "lojista";
 *
 * Cenário chave: um LOJISTA (azul ciano) abre o perfil público de um
 * PRESTADOR (âmbar). Antes de qualquer efeito assíncrono, o tema já deve
 * ser âmbar — não pode haver flash da cor do visitante nem do segmento
 * de URL. Também valida as demais categorias e o efeito do priming pelo
 * cache compartilhado (carrossel / chat / etc).
 */
import { describe, it, expect, beforeEach } from "vitest";
import {
  categoryFromProfilePath,
  peekPublicProfileCategory,
  primePublicProfileCategory,
  clearPublicProfileCategoryCache,
  type PublicProfileCategory,
} from "@/lib/public-profile-category";
import { getCategoryTheme, CATEGORY_COLORS } from "@/lib/category-colors";
import { getCategoryColor } from "@/lib/getCategoryColor";

// Reproduz literalmente o initializer do useState no componente.
function seedCategory(userId: string, pathname: string): PublicProfileCategory {
  return (
    peekPublicProfileCategory(userId) ??
    categoryFromProfilePath(pathname) ??
    "lojista"
  );
}

// Reproduz o wrapper de tema aplicado pelo componente ao container raiz.
function seedThemeStyle(userId: string, pathname: string) {
  const category = seedCategory(userId, pathname);
  const theme = getCategoryTheme(category);
  return {
    style: {
      ["--primary"]: theme.hex,
      ["--ring"]: theme.hex,
      ["--primary-rgb"]: theme.rgb,
    },
    utility: getCategoryColor(category),
    category,
  };
}

beforeEach(() => {
  clearPublicProfileCategoryCache();
});

describe("perfil público — tema derivado no primeiro render", () => {
  it("visitante lojista abrindo perfil de prestador vê âmbar (sem flash de ciano)", () => {
    const peerId = "prestador-xyz";
    // Simula o carrossel/chat priming o cache (fluxo real da aplicação).
    primePublicProfileCategory(peerId, "prestador");

    // Aponta para a rota canônica correta (âmbar por prestador) e para o
    // caso em que o segmento da URL ainda é o "errado" (visitante clicou
    // em um link antigo /lojista/:id): a resolução por CACHE prevalece.
    for (const pathname of [`/prestador/${peerId}`, `/lojista/${peerId}`]) {
      const { category, style, utility } = seedThemeStyle(peerId, pathname);
      expect(category).toBe("prestador");
      expect(style["--primary"]).toBe(CATEGORY_COLORS.prestador); // #FF9F0A
      expect(style["--primary"]).not.toBe(CATEGORY_COLORS.lojista); // ≠ ciano
      expect(utility.hex).toBe("#FF9F0A");
      expect(utility.border).toContain("#FF9F0A");
      expect(utility.text).toContain("#FF9F0A");
      expect(utility.badgeBg).toContain("#FF9F0A");
    }
  });

  it("sem cache, deriva a cor do segmento canônico da URL para toda categoria", () => {
    const cases: Array<[string, PublicProfileCategory, string]> = [
      ["/lojista/abc", "lojista", CATEGORY_COLORS.lojista],       // #00E5FF
      ["/prestador/abc", "prestador", CATEGORY_COLORS.prestador], // #FF9F0A
      ["/parceiro/abc", "fornecedor", CATEGORY_COLORS.fornecedor], // #A855F7
      ["/fornecedor/abc", "fornecedor", CATEGORY_COLORS.fornecedor],
      ["/cliente/abc", "cliente", CATEGORY_COLORS.cliente],       // #00FF87
    ];
    for (const [pathname, expected, hex] of cases) {
      const { category, style, utility } = seedThemeStyle("abc", pathname);
      expect(category).toBe(expected);
      expect(style["--primary"]).toBe(hex);
      expect(utility.hex).toBe(hex);
    }
  });

  it("cache prevalece sobre o segmento da URL (visitou por rota antiga/genérica)", () => {
    primePublicProfileCategory("uid-1", "fornecedor");
    const { category, utility } = seedThemeStyle("uid-1", "/lojista/uid-1");
    expect(category).toBe("fornecedor");
    expect(utility.hex).toBe(CATEGORY_COLORS.fornecedor);
  });

  it("cache é por userId — não vaza entre perfis", () => {
    primePublicProfileCategory("uid-prest", "prestador");
    primePublicProfileCategory("uid-forn", "fornecedor");
    expect(seedCategory("uid-prest", "/lojista/uid-prest")).toBe("prestador");
    expect(seedCategory("uid-forn", "/lojista/uid-forn")).toBe("fornecedor");
    expect(seedCategory("uid-desconhecido", "/lojista/uid-desconhecido")).toBe("lojista");
  });

  it("todas as classes utilitárias (border/text/bg/badge) refletem a cor da categoria visitada", () => {
    const roles: Array<[PublicProfileCategory, string]> = [
      ["lojista", "#00E5FF"],
      ["prestador", "#FF9F0A"],
      ["fornecedor", "#A855F7"],
      ["cliente", "#00FF87"],
    ];
    for (const [cat, hex] of roles) {
      primePublicProfileCategory(`uid-${cat}`, cat);
      const { utility } = seedThemeStyle(`uid-${cat}`, `/lojista/uid-${cat}`);
      expect(utility.border).toBe(`border-[${hex}]`);
      expect(utility.text).toBe(`text-[${hex}]`);
      expect(utility.bg).toBe(`bg-[${hex}]`);
      expect(utility.badgeBg).toContain(hex);
    }
  });
});
