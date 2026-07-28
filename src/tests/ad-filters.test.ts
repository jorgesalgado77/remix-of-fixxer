import { describe, it, expect, vi } from "vitest";
import {
  normalizeAdTags,
  coerceUrgency,
  matchesAdFilters,
  applyAdFiltersToQuery,
  formatTagLabel,
  type AdQueryBuilder,
} from "@/lib/ad-filters";

describe("normalizeAdTags", () => {
  it("aceita entrada com #hashtag, vírgulas e espaços", () => {
    expect(normalizeAdTags("#promob, mdf  #compensado")).toEqual([
      "promob",
      "mdf",
      "compensado",
    ]);
  });
  it("remove duplicadas preservando a primeira ocorrência", () => {
    expect(normalizeAdTags("#promob promob PROMOB #mdf")).toEqual(["promob", "mdf"]);
  });
  it("limita a 5 tags por padrão", () => {
    expect(normalizeAdTags("a b c d e f g h").length).toBe(5);
  });
  it("remove caracteres especiais mas mantém acento/underscore/traço", () => {
    expect(normalizeAdTags("#promo!!, mdf@@, cor_1, off-line")).toEqual([
      "promo",
      "mdf",
      "cor_1",
      "off-line",
    ]);
  });
  it("aceita array como entrada", () => {
    expect(normalizeAdTags(["#a", "b", "a"])).toEqual(["a", "b"]);
  });
  it("retorna vazio para entradas nulas/vazias", () => {
    expect(normalizeAdTags("")).toEqual([]);
    expect(normalizeAdTags(null)).toEqual([]);
    expect(normalizeAdTags(undefined)).toEqual([]);
  });
  it("formatTagLabel adiciona # exatamente uma vez", () => {
    expect(formatTagLabel("promob")).toBe("#promob");
    expect(formatTagLabel("#promob")).toBe("#promob");
    expect(formatTagLabel("")).toBe("");
  });
});

describe("coerceUrgency", () => {
  it("mapeia critica → urgente", () => {
    expect(coerceUrgency("critica")).toBe("urgente");
    expect(coerceUrgency("URGENTE")).toBe("urgente");
    expect(coerceUrgency("encomenda")).toBe("encomenda");
    expect(coerceUrgency("normal")).toBe("normal");
    expect(coerceUrgency("outro")).toBeNull();
    expect(coerceUrgency(null)).toBeNull();
  });
});

describe("matchesAdFilters", () => {
  const base = {
    urgency_tag: "urgente" as const,
    service_radius_km: 15,
    tags: ["promob", "mdf"],
    title: "Montagem de armário",
    description: "Serviço em Sorocaba com transporte",
  };
  it("combina urgência + distância + tag + termo", () => {
    expect(
      matchesAdFilters(base, {
        urgency: "urgente",
        distance: 30,
        tag: "#mdf",
        term: "armário",
      }),
    ).toBe(true);
  });
  it("rejeita quando urgência diverge", () => {
    expect(matchesAdFilters(base, { urgency: "encomenda" })).toBe(false);
  });
  it("rejeita quando raio ultrapassa o limite", () => {
    expect(matchesAdFilters({ ...base, service_radius_km: 50 }, { distance: 30 })).toBe(false);
  });
  it("rejeita quando a tag não bate", () => {
    expect(matchesAdFilters(base, { tag: "cozinha" })).toBe(false);
  });
  it("aceita 'todos' como neutro para urgência e distância", () => {
    expect(matchesAdFilters(base, { urgency: "todos", distance: "todos" })).toBe(true);
  });
  it("normaliza urgência 'critica' vinda do banco", () => {
    expect(matchesAdFilters({ ...base, urgency_tag: "critica" }, { urgency: "urgente" })).toBe(
      true,
    );
  });
});

describe("applyAdFiltersToQuery", () => {
  function makeBuilder() {
    const calls: Array<{ fn: string; args: unknown[] }> = [];
    const builder: AdQueryBuilder = {
      eq: vi.fn((...args) => {
        calls.push({ fn: "eq", args });
        return builder;
      }),
      lte: vi.fn((...args) => {
        calls.push({ fn: "lte", args });
        return builder;
      }),
      overlaps: vi.fn((...args) => {
        calls.push({ fn: "overlaps", args });
        return builder;
      }),
      or: vi.fn((...args) => {
        calls.push({ fn: "or", args });
        return builder;
      }),
      ilike: vi.fn((...args) => {
        calls.push({ fn: "ilike", args });
        return builder;
      }),
    };
    return { builder, calls };
  }

  it("aplica urgência, distância, tag e termo na query", () => {
    const { builder, calls } = makeBuilder();
    applyAdFiltersToQuery(builder, {
      urgency: "urgente",
      distance: 15,
      tag: "#promob",
      term: "armário",
    });
    expect(calls).toEqual([
      { fn: "eq", args: ["urgency_tag", "urgente"] },
      { fn: "lte", args: ["service_radius_km", 15] },
      { fn: "overlaps", args: ["tags", ["promob"]] },
      { fn: "or", args: ["title.ilike.%armário%,description.ilike.%armário%"] },
    ]);
  });

  it("não aplica filtros quando valores são 'todos' ou vazios", () => {
    const { builder, calls } = makeBuilder();
    applyAdFiltersToQuery(builder, { urgency: "todos", distance: "todos", tag: "", term: "" });
    expect(calls).toEqual([]);
  });

  it("higieniza caracteres perigosos no termo (%, vírgula, parênteses)", () => {
    const { builder, calls } = makeBuilder();
    applyAdFiltersToQuery(builder, { term: "100%,off()" });
    expect(calls[0]?.args[0]).toBe("title.ilike.%100  off%,description.ilike.%100  off%");
  });
});
