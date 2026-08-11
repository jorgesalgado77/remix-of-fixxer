/**
 * FIXXER — Teste de regressão: cor por categoria no perfil público.
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
    theme,
    category,
  };
}

beforeEach(() => {
  clearPublicProfileCategoryCache();
});

describe("perfil público — tema derivado no primeiro render", () => {
  it("visitante lojista abrindo perfil de prestador vê âmbar (sem flash de ciano)", () => {
    const peerId = "prestador-xyz";
    primePublicProfileCategory(peerId, "prestador");

    for (const pathname of [`/prestador/${peerId}`, `/lojista/${peerId}`]) {
      const { category, style, theme } = seedThemeStyle(peerId, pathname);
      expect(category).toBe("prestador");
      expect(style["--primary"]).toBe(CATEGORY_COLORS.prestador);
      expect(theme.hex).toBe("#FF9F0A");
    }
  });

  it("sem cache, deriva a cor do segmento canônico da URL para toda categoria", () => {
    const cases: Array<[string, PublicProfileCategory, string]> = [
      ["/lojista/abc", "lojista", CATEGORY_COLORS.lojista],
      ["/prestador/abc", "prestador", CATEGORY_COLORS.prestador],
      ["/parceiro/abc", "fornecedor", CATEGORY_COLORS.fornecedor],
      ["/cliente/abc", "cliente", CATEGORY_COLORS.cliente],
    ];
    for (const [pathname, expected, hex] of cases) {
      const { category, style, theme } = seedThemeStyle("abc", pathname);
      expect(category).toBe(expected);
      expect(style["--primary"]).toBe(hex);
      expect(theme.hex).toBe(hex);
    }
  });
});
