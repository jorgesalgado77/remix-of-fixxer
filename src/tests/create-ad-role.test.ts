/**
 * FIXXER — testes do CreateAdModal (identidade visual dinâmica).
 *
 * Cobre:
 *  - Cada papel (lojista/prestador/fornecedor/cliente) gera título,
 *    rótulo de publicação e cor oficial corretos.
 *  - Papel inválido / sessão indefinida cai no fallback seguro
 *    ("lojista") com mensagem amigável (`fallbackUsed=true`).
 *  - `defaultCategory` da prop é respeitada quando o usuário é admin.
 *  - As cores oficiais (Ciano #00E5FF, Âmbar #FF9F0A, Roxo #A855F7,
 *    Verde #00FF87) permanecem sincronizadas com CATEGORY_COLORS.
 */
import { describe, it, expect } from "vitest";
import { resolveEffectiveCategory, ROLE_COPY } from "@/lib/create-ad-role";
import { CATEGORY_COLORS } from "@/lib/category-colors";

describe("CreateAdModal — cores e rótulos dinâmicos por categoria", () => {
  it("lojista → título comercial + Ciano #00E5FF", () => {
    const r = resolveEffectiveCategory("lojista");
    expect(r.category).toBe("lojista");
    expect(r.hex).toBe("#00E5FF");
    expect(r.copy.title).toMatch(/Anúncio Comercial/i);
    expect(r.copy.publish).toMatch(/Publicar Oferta/i);
    expect(r.fallbackUsed).toBe(false);
  });

  it("prestador → pacote de serviço + Âmbar #FF9F0A", () => {
    const r = resolveEffectiveCategory("prestador");
    expect(r.category).toBe("prestador");
    expect(r.hex).toBe("#FF9F0A");
    expect(r.copy.title).toMatch(/Pacote de Serviço/i);
    expect(r.copy.publish).toMatch(/Publicar Serviço/i);
  });

  it("fornecedor → anúncio comercial + Roxo #A855F7", () => {
    const r = resolveEffectiveCategory("fornecedor");
    expect(r.category).toBe("fornecedor");
    expect(r.hex).toBe("#A855F7");
    expect(r.copy.title).toMatch(/Anúncio Comercial/i);
    expect(r.copy.publish).toMatch(/Publicar Oferta/i);
  });

  it("cliente → pedido + Verde #00FF87", () => {
    const r = resolveEffectiveCategory("cliente");
    expect(r.category).toBe("cliente");
    expect(r.hex).toBe("#00FF87");
    expect(r.copy.title).toMatch(/Solicitação de Serviço|Pedido/i);
    expect(r.copy.publish).toMatch(/Publicar Pedido/i);
  });
});

describe("CreateAdModal — fallback seguro", () => {
  it("papel inválido → cai em lojista com aviso amigável", () => {
    const r = resolveEffectiveCategory("marciano" as any);
    expect(r.category).toBe("lojista");
    expect(r.fallbackUsed).toBe(true);
    expect(r.fallbackMessage).toMatch(/papel|perfil/i);
  });

  it("null/undefined → cai em lojista com aviso amigável", () => {
    for (const bad of [null, undefined, ""]) {
      const r = resolveEffectiveCategory(bad as any);
      expect(r.category).toBe("lojista");
      expect(r.fallbackUsed).toBe(true);
    }
  });

  it("papel inválido + defaultCategory prop válida → usa a prop", () => {
    const r = resolveEffectiveCategory(undefined, "prestador");
    expect(r.category).toBe("prestador");
    expect(r.hex).toBe("#FF9F0A");
    expect(r.fallbackUsed).toBe(true);
  });

  it("admin sem prop → usa lojista (default), sem marcar fallback", () => {
    const r = resolveEffectiveCategory("admin");
    expect(r.category).toBe("lojista");
    expect(r.fallbackUsed).toBe(false);
  });

  it("admin + defaultCategory prop → respeita a prop", () => {
    const r = resolveEffectiveCategory("admin", "cliente");
    expect(r.category).toBe("cliente");
    expect(r.hex).toBe("#00FF87");
    expect(r.fallbackUsed).toBe(false);
  });
});

describe("CreateAdModal — sincronia com paleta oficial", () => {
  it("todas as categorias têm cópia registrada", () => {
    for (const k of ["lojista", "prestador", "fornecedor", "cliente"] as const) {
      expect(ROLE_COPY[k]).toBeTruthy();
      expect(ROLE_COPY[k].title).toBeTypeOf("string");
      expect(ROLE_COPY[k].publish).toBeTypeOf("string");
    }
  });

  it("hex retornado corresponde à paleta CATEGORY_COLORS", () => {
    for (const k of ["lojista", "prestador", "fornecedor", "cliente"] as const) {
      expect(resolveEffectiveCategory(k).hex).toBe(CATEGORY_COLORS[k]);
    }
  });
});
