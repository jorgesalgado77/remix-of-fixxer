import { describe, it, expect } from "vitest";
import {
  evaluateProfileCompleteness,
  describeMissing,
} from "@/lib/profile-completeness";

/**
 * Garante que a validação usada para habilitar os botões Publicar e
 * Avaliações no LojistaPage.tsx segue EXATAMENTE o mesmo conjunto de
 * campos do submit do formulário (linha ~2972 do LojistaPage.tsx).
 *
 * O mapeamento aqui espelha o objeto `mapped`/`evaluate({...})` produzido
 * pelo listener `fixxer:profile-saved` após mesclar `store_profiles`,
 * `profiles` e `custom_sections.__extras`.
 */

const completeLojistaProfile = {
  company_name: "Confere Planejados",
  cnpj: "12.345.678/0001-99", // 14 dígitos
  responsible_name: "Jorge Salgado",
  email_contact: "jorge@confere.com.br",
  whatsapp: "(11) 99999-9999",
  zipcode: "01310-100",
  address: "Av. Paulista",
  address_number: "1000",
  city: "São Paulo",
  state: "SP",
  activity_branch: "Móveis Planejados",
};

describe("evaluateProfileCompleteness — lojista (botões Publicar/Avaliações)", () => {
  it("libera os botões quando todos os campos obrigatórios estão preenchidos", () => {
    const result = evaluateProfileCompleteness("lojista", completeLojistaProfile);
    expect(result.complete).toBe(true);
    expect(result.missing).toEqual([]);
    expect(result.missingLabels).toEqual([]);
  });

  it("mantém bloqueados quando falta WhatsApp", () => {
    const { whatsapp: _drop, ...partial } = completeLojistaProfile;
    const result = evaluateProfileCompleteness("lojista", partial);
    expect(result.complete).toBe(false);
    expect(result.missingLabels).toContain("WhatsApp");
  });

  it("rejeita CNPJ com menos de 14 dígitos", () => {
    const result = evaluateProfileCompleteness("lojista", {
      ...completeLojistaProfile,
      cnpj: "123",
    });
    expect(result.complete).toBe(false);
    expect(result.missing).toContain("cnpj");
  });

  it("rejeita CEP inválido e mostra rótulo amigável", () => {
    const result = evaluateProfileCompleteness("lojista", {
      ...completeLojistaProfile,
      zipcode: "123",
    });
    expect(result.complete).toBe(false);
    expect(result.missingLabels).toContain("CEP");
    expect(describeMissing(result)).toContain("CEP");
  });

  it("rejeita e-mail sem formato válido", () => {
    const result = evaluateProfileCompleteness("lojista", {
      ...completeLojistaProfile,
      email_contact: "sem-arroba",
    });
    expect(result.complete).toBe(false);
    expect(result.missing).toContain("email_contact");
  });

  it("exige endereço, cidade e estado (mesmos campos do submit)", () => {
    const partial = {
      ...completeLojistaProfile,
      address: "",
      city: "",
      state: "",
    };
    const result = evaluateProfileCompleteness("lojista", partial);
    expect(result.complete).toBe(false);
    expect(result.missingLabels).toEqual(
      expect.arrayContaining(["Endereço", "Cidade", "Estado"]),
    );
  });

  it("aceita mapeamento vindo de custom_sections.__extras + profiles (merge do listener)", () => {
    // Simula o objeto que o listener `fixxer:profile-saved` monta:
    // { ...unified, ...(store_profiles || {}) } onde unified = { ...__extras, ...profiles }
    const profilesRow = {
      full_name: "Jorge Salgado",
      email: "jorge@confere.com.br",
      phone: "(11) 99999-9999",
      document_number: "12.345.678/0001-99",
      city: "São Paulo",
      state: "SP",
      business_category: "Móveis Planejados",
    };
    const extras = {
      display_name: "Confere Planejados",
      cep: "01310-100",
      address: "Av. Paulista",
      address_number: "1000",
    };
    const unified: any = { ...extras, ...profilesRow };

    const mapped = {
      company_name: unified.display_name || unified.full_name,
      cnpj: unified.document_number,
      responsible_name: unified.full_name,
      email_contact: unified.email,
      whatsapp: unified.phone,
      zipcode: unified.cep,
      address: unified.address,
      address_number: unified.address_number,
      city: unified.city,
      state: unified.state,
      activity_branch: unified.business_category,
    };

    const result = evaluateProfileCompleteness("lojista", mapped);
    expect(result.complete).toBe(true);
    expect(result.missingLabels).toEqual([]);
  });
});
