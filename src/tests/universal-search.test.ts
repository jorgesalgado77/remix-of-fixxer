import { describe, it, expect } from "vitest";
import {
  stripAccents,
  rowMatchesTerm,
  getMatchedFields,
  scoreRow,
  sortByRelevance,
  splitHighlight,
  expandSynonyms,
} from "@/lib/universal-search";

const lojaMoveis = {
  id: "loja-1",
  display_name: "Móveis Planejados Confere",
  company_name: "Confere Planejados LTDA",
  business_category: "Móveis Planejados",
  city: "Sorocaba",
  state: "SP",
  user_type: "lojista",
};

const prestadorConferente = {
  id: "prest-1",
  display_name: "Jorge Salgado",
  specialty: "Conferente Técnico",
  role: "prestador",
  city: "Votorantim",
  state: "SP",
};

const barbearia = {
  id: "prest-2",
  display_name: "Barbearia do João",
  business_category: "Barbearia",
  role: "prestador",
  city: "São Paulo",
  state: "SP",
};

const cliente = {
  id: "cli-1",
  display_name: "Cliente Casual",
  role: "cliente",
  city: "Campinas",
  state: "SP",
};

describe("stripAccents", () => {
  it("normaliza acentos e caixa", () => {
    expect(stripAccents("Móveis Planejados")).toBe("moveis planejados");
    expect(stripAccents("SÃO PAULO")).toBe("sao paulo");
    expect(stripAccents("  Conferência  ")).toBe("conferencia");
  });
  it("aceita entradas nulas/indefinidas sem quebrar", () => {
    expect(stripAccents(null)).toBe("");
    expect(stripAccents(undefined)).toBe("");
    expect(stripAccents(123 as any)).toBe("123");
  });
});

describe("rowMatchesTerm — accent/case insensitive", () => {
  it("casa 'moveis' com 'Móveis Planejados'", () => {
    expect(rowMatchesTerm(lojaMoveis, "moveis")).toBe(true);
    expect(rowMatchesTerm(lojaMoveis, "MÓVEIS")).toBe(true);
    expect(rowMatchesTerm(lojaMoveis, "planejados moveis")).toBe(true);
  });

  it("casa 'barbearia' em prestador", () => {
    expect(rowMatchesTerm(barbearia, "barbearia")).toBe(true);
    expect(rowMatchesTerm(barbearia, "BARBEIRO")).toBe(true); // via sinônimo
  });

  it("casa 'confer' parcial em conferente", () => {
    expect(rowMatchesTerm(prestadorConferente, "conferente")).toBe(true);
    expect(rowMatchesTerm(prestadorConferente, "conferência")).toBe(true);
  });

  it("não casa termo inexistente", () => {
    expect(rowMatchesTerm(barbearia, "encanador")).toBe(false);
  });

  it("ignora termo vazio", () => {
    expect(rowMatchesTerm(barbearia, "")).toBe(false);
    expect(rowMatchesTerm(barbearia, "   ")).toBe(false);
  });
});

describe("getMatchedFields", () => {
  it("identifica os campos onde o termo aparece", () => {
    const fields = getMatchedFields(lojaMoveis, "moveis");
    expect(fields).toContain("business_category");
    expect(fields).toContain("display_name");
  });

  it("retorna vazio para termo ausente", () => {
    expect(getMatchedFields(barbearia, "chaveiro")).toEqual([]);
  });
});

describe("scoreRow — ranking de relevância", () => {
  it("dá score maior para match no nome do que na cidade", () => {
    const rowNome = { display_name: "Barbearia Central", role: "prestador" };
    const rowCidade = { display_name: "Salão X", city: "Barbearia da Serra", role: "prestador" };
    expect(scoreRow(rowNome, "barbearia", "prestador")).toBeGreaterThan(
      scoreRow(rowCidade, "barbearia", "prestador"),
    );
  });

  it("aplica bônus por categoria (lojista > prestador em empate)", () => {
    const base = { display_name: "Móveis Planejados" };
    expect(scoreRow(base, "moveis", "lojista")).toBeGreaterThan(
      scoreRow(base, "moveis", "prestador"),
    );
  });

  it("score zero para termo vazio", () => {
    expect(scoreRow(lojaMoveis, "", "lojista")).toBe(0);
  });
});

describe("sortByRelevance — ordenação mista lojistas/prestadores", () => {
  it("prioriza match no nome sobre match em campo secundário", () => {
    const items = [
      { id: "a", name: "Prestador Genérico", category: "prestador" as const, raw: cliente },
      { id: "b", name: "Móveis Planejados", category: "lojista" as const, raw: lojaMoveis },
      { id: "c", name: "Barbearia do João", category: "prestador" as const, raw: barbearia },
    ];
    const sorted = sortByRelevance(items, "moveis", (i) => i.raw);
    expect(sorted[0].id).toBe("b");
  });

  it("mantém resultados sem match no fim", () => {
    const items = [
      { id: "x", name: "Sem Relação", category: "cliente" as const, raw: cliente },
      { id: "y", name: "Barbearia", category: "prestador" as const, raw: barbearia },
    ];
    const sorted = sortByRelevance(items, "barbearia", (i) => i.raw);
    expect(sorted[0].id).toBe("y");
    expect(sorted[1].id).toBe("x");
  });
});

describe("splitHighlight — destaque seguro", () => {
  it("destaca ocorrência insensível a acento", () => {
    const parts = splitHighlight("Móveis Planejados", "moveis");
    expect(parts.filter((p) => p.hit).map((p) => p.text)).toEqual(["Móveis"]);
    expect(parts.map((p) => p.text).join("")).toBe("Móveis Planejados");
  });

  it("destaca múltiplas palavras do termo", () => {
    const parts = splitHighlight("Barbearia do João Central", "barbearia joao");
    const hits = parts.filter((p) => p.hit).map((p) => p.text.toLowerCase());
    expect(hits).toContain("barbearia");
    expect(hits).toContain("joão");
  });

  it("retorna a string original quando nada casa", () => {
    const parts = splitHighlight("Nada aqui", "xyz");
    expect(parts).toEqual([{ text: "Nada aqui", hit: false }]);
  });

  it("preserva a string integralmente na concatenação", () => {
    const src = "Conferência Técnica — SP";
    const parts = splitHighlight(src, "conferencia");
    expect(parts.map((p) => p.text).join("")).toBe(src);
  });

  it("tolera entradas nulas", () => {
    expect(splitHighlight(null, "x")).toEqual([{ text: "", hit: false }]);
    expect(splitHighlight("abc", "")).toEqual([{ text: "abc", hit: false }]);
  });
});

describe("expandSynonyms", () => {
  it("inclui sinônimos conhecidos", () => {
    const s = expandSynonyms("moveis");
    expect(s).toContain("mobilia");
    expect(s).toContain("moveis");
  });
  it("retorna vazio para termo vazio", () => {
    expect(expandSynonyms("")).toEqual([]);
  });
});
