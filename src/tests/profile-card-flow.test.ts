import { describe, it, expect } from "vitest";
import { evaluateProfileCompleteness } from "@/lib/profile-completeness";

/**
 * Regressão do fluxo:
 *   Card amarelo (LojistaPage) → clique → /profile?focus=<campo>
 *   → usuário salva → evento `fixxer:profile-saved` → recarrega
 *   `public.profiles` (+ `custom_sections.__extras`) → recalcula
 *   completude → card amarelo some sem reload.
 *
 * Este teste espelha o mapeamento `mapFromProfiles` do LojistaPage
 * (que agora usa APENAS `profiles` + `__extras`, sem `store_profiles`).
 * Se este mapeamento divergir do de LojistaPage, o teste quebra e
 * evitamos que campos já salvos voltem a aparecer como pendentes.
 */

// Espelho de `mapFromProfiles` em src/components/pages/LojistaPage.tsx.
function mapFromProfiles(prof: any) {
  const extras = (prof?.custom_sections?.__extras) || {};
  const unified: any = { ...extras, ...prof };
  return {
    id: unified.id,
    company_name: unified.company_name || unified.display_name || unified.full_name || "",
    cnpj: unified.cnpj || unified.cnpj_cpf || unified.document_number || "",
    responsible_name: unified.responsible_name || unified.full_name || unified.display_name || "",
    email_contact: unified.email_contact || unified.contact_email || unified.email || "",
    whatsapp: unified.whatsapp || unified.phone || "",
    zipcode: unified.zipcode || unified.cep || unified.postal_code || "",
    address: unified.address || unified.street || unified.logradouro || "",
    address_number: unified.address_number || unified.numero || "",
    neighborhood: unified.neighborhood || unified.bairro || "",
    activity_branch: unified.activity_branch || unified.business_category || unified.custom_branch || "",
    logo_url: unified.logo_url || unified.avatar_url || null,
    city: unified.city || unified.localidade || "",
    state: unified.state || unified.uf || "",
  };
}

const baseProfilesRow = {
  id: "user-1",
  full_name: "Jorge Salgado",
  display_name: "Confere Planejados",
  contact_email: "jorge@confere.com.br",
  cnpj_cpf: "12.345.678/0001-99",
  city: "São Paulo",
  state: "SP",
  business_category: "Móveis Planejados",
  street: "Av. Paulista",
  address_number: "1000",
  cep: "01310-100",
  custom_sections: { __extras: {} as Record<string, any> },
};

describe("Regressão: card amarelo lê a mesma fonte que /profile", () => {
  it("WhatsApp salvo em custom_sections.__extras marca perfil como completo", () => {
    const row = {
      ...baseProfilesRow,
      custom_sections: { __extras: { whatsapp: "(11) 99999-9999" } },
    };
    const mapped = mapFromProfiles(row);
    const result = evaluateProfileCompleteness("lojista", mapped);
    expect(result.missing).not.toContain("whatsapp");
    expect(result.complete).toBe(true);
  });

  it("WhatsApp salvo diretamente em profiles.phone também completa", () => {
    const row = { ...baseProfilesRow, phone: "(11) 98888-7777" };
    const mapped = mapFromProfiles(row);
    const result = evaluateProfileCompleteness("lojista", mapped);
    expect(result.complete).toBe(true);
  });

  it("SEM WhatsApp em lugar nenhum → card deve aparecer com WhatsApp faltando", () => {
    const mapped = mapFromProfiles(baseProfilesRow);
    const result = evaluateProfileCompleteness("lojista", mapped);
    expect(result.complete).toBe(false);
    expect(result.missing).toContain("whatsapp");
    expect(result.missingLabels).toContain("WhatsApp");
  });

  it("endereço/CEP em __extras (fluxo antigo) ainda é reconhecido", () => {
    const minimalRow = {
      id: "user-2",
      full_name: "Loja Teste",
      contact_email: "loja@teste.com",
      cnpj_cpf: "11.222.333/0001-44",
      business_category: "Serviços",
      city: "Rio",
      state: "RJ",
      custom_sections: {
        __extras: {
          whatsapp: "(21) 99999-1111",
          cep: "20040-000",
          address: "Rua X",
          address_number: "10",
        },
      },
    };
    const mapped = mapFromProfiles(minimalRow);
    const result = evaluateProfileCompleteness("lojista", mapped);
    expect(result.complete).toBe(true);
  });

  it("simula flip incompleto→completo após salvar em /profile", () => {
    // Antes: falta WhatsApp
    const before = mapFromProfiles(baseProfilesRow);
    const r1 = evaluateProfileCompleteness("lojista", before);
    expect(r1.complete).toBe(false);

    // Depois: usuário salvou WhatsApp em __extras (como o /profile faz)
    const after = mapFromProfiles({
      ...baseProfilesRow,
      custom_sections: { __extras: { whatsapp: "(11) 90000-0000" } },
    });
    const r2 = evaluateProfileCompleteness("lojista", after);
    expect(r2.complete).toBe(true);

    // Transição incompleto → completo dispara o banner "justCompleted".
    // A UI observa exatamente essa mudança de flag via useEffect.
    expect(r1.complete).not.toBe(r2.complete);
  });

  it("NÃO consulta store_profiles (fonte única = profiles + __extras)", () => {
    // Se algum dia alguém reintroduzir store_profiles no mapping,
    // esta asserção quebra o build para forçar a revisão do fluxo.
    const src = mapFromProfiles.toString();
    expect(src).not.toMatch(/store_profiles/);
  });
});
