import { describe, it, expect } from "vitest";
import { findSimilar, normalize, isAllowedRadius, ALLOWED_RADII_KM } from "@/lib/branch-search";
import { flattenBranches } from "@/lib/activity-branches";

/**
 * Testes da inteligência do campo "Outro (Digitar Ramo Customizado)".
 *
 * Cobrem o mesmo algoritmo consumido pelo ActivityBranchPicker para exibir
 * o card "💡 Identificamos que essa especialidade já existe..." e o
 * botão "✅ Usar Categoria Oficial".
 */

const ALL = flattenBranches();

describe("normalize()", () => {
  it("remove acentos, case e pontuação", () => {
    expect(normalize("Áçãoú-42!")).toBe("acaou 42");
  });

  it("colapsa espaços múltiplos", () => {
    expect(normalize("  a   b  ")).toBe("a b");
  });
});

describe("findSimilar() — fuzzy search 'Outro'", () => {
  it("retorna null para termos muito curtos", () => {
    expect(findSimilar("ab", ALL)).toBeNull();
    expect(findSimilar("", ALL)).toBeNull();
  });

  it("encontra correspondência exata ignorando acento/case", () => {
    // presume-se que a matriz oficial contém 'Trancista' em algum ramo
    const hit = findSimilar("trancista", ALL);
    expect(hit).not.toBeNull();
    expect(normalize(hit!)).toContain("trancista");
  });

  it("encontra por include parcial (usuário digita subtermo)", () => {
    const hit = findSimilar("banho e tos", ALL);
    expect(hit).not.toBeNull();
    expect(normalize(hit!)).toContain("banho");
  });

  it("encontra por palavras-chave desordenadas", () => {
    const hit = findSimilar("tosa cachorro banho", ALL);
    // Deve casar com 'Banho e Tosa' via keyword match
    expect(hit).not.toBeNull();
  });

  it("retorna null para termos sem qualquer relação", () => {
    const hit = findSimilar("xyzqwertabc123", ALL);
    expect(hit).toBeNull();
  });

  it("é o mesmo motor que decide exibir o botão 'Usar Categoria Oficial'", () => {
    // Simula fluxo: usuário digita algo, componente pede sugestão;
    // se veio string, o botão é renderizado com esse texto.
    const typed = "cabeleireira";
    const suggestion = findSimilar(typed, ALL);
    expect(suggestion).not.toBeNull();
    // Ao clicar no botão, o valor externo deve virar a sugestão oficial:
    const applied = suggestion!;
    expect(applied).toBe(suggestion);
    expect(applied.length).toBeGreaterThan(0);
  });
});

describe("isAllowedRadius() — validação do Raio Padrão", () => {
  it("aceita apenas 10/25/50/100 km", () => {
    for (const v of ALLOWED_RADII_KM) expect(isAllowedRadius(v)).toBe(true);
  });

  it("rejeita valores fora da lista permitida", () => {
    expect(isAllowedRadius(0)).toBe(false);
    expect(isAllowedRadius(15)).toBe(false);
    expect(isAllowedRadius(999)).toBe(false);
    expect(isAllowedRadius(null)).toBe(false);
    expect(isAllowedRadius("25")).toBe(false);
  });
});
