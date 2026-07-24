// ============================================================
// FIXXER — Matriz Multi-Setorial de Ramos de Atividade
// Fonte única de verdade para cadastro e perfis
// ============================================================

export type ActivityBranch = {
  label: string;
  subcategories?: string[];
};

export type ActivityMacroCategory = {
  id: string;
  icon: string;
  label: string;
  branches: ActivityBranch[];
};

export const ACTIVITY_MATRIX: ActivityMacroCategory[] = [
  {
    id: "moveis_reformas",
    icon: "🏠",
    label: "Móveis, Decoração e Reformas",
    branches: [
      { label: "Móveis Planejados & Marcenaria" },
      { label: "Marmoraria" },
      { label: "Vidraçaria" },
      { label: "Construção Civil & Reformas" },
      { label: "Gesso/Drywall" },
      { label: "Pintura" },
      { label: "Arquitetura & Engenharia" },
      { label: "📝 Outro (Digitar Ramo Customizado)" },
    ],
  },
  {
    id: "beleza_estetica",
    icon: "💈",
    label: "Beleza, Estética e Bem-Estar",
    branches: [
      {
        label: "Salão de Beleza & Cabelo",
        subcategories: [
          "Cabeleireiro(a)",
          "Escovista",
          "Colorista",
          "Assistente",
          "🪮 Trancista (Box Braids, Nagô, Entrelace, Afro)",
        ],
      },
      { label: "Barbearia" },
      { label: "Manicure / Esmalteria" },
      { label: "Estética Facial / Corporal" },
      { label: "Maquiagem & Penteado" },
      { label: "Massoterapia" },
      { label: "📝 Outro (Digitar Ramo Customizado)" },
    ],
  },
  {
    id: "pet_veterinaria",
    icon: "🐶",
    label: "Pet & Veterinária",
    branches: [
      { label: "Clínica Veterinária & Hospital Pet" },
      { label: "Pet Shop & Banho e Tosa (Groomer)" },
      { label: "Adestramento & Dog Walker" },
      { label: "Casa de Ração" },
      { label: "📝 Outro (Digitar Ramo Customizado)" },
    ],
  },
  {
    id: "manutencao_servicos",
    icon: "⚡",
    label: "Manutenção, Instalações e Serviços Gerais",
    branches: [
      { label: "Elétrica & Automação" },
      { label: "Hidráulica & Encanamento" },
      { label: "Ar-Condicionado" },
      { label: "Serralheria" },
      { label: "Marido de Aluguel" },
      { label: "Limpeza & Conservação (Diarista / Pós-Obra)" },
      { label: "Segurança Eletrônica / CFTV" },
      { label: "📝 Outro (Digitar Ramo Customizado)" },
    ],
  },
  {
    id: "saude_cuidados",
    icon: "🩺",
    label: "Saúde, Odontologia e Cuidados",
    branches: [
      { label: "Consultório Odontológico" },
      { label: "Clínica Médica" },
      { label: "Fisioterapia" },
      { label: "Cuidador de Idosos / Enfermagem" },
      { label: "📝 Outro (Digitar Ramo Customizado)" },
    ],
  },
  {
    id: "logistica_veiculos",
    icon: "🚚",
    label: "Logística, Fretes e Veículos",
    branches: [
      { label: "Fretes / Mudanças" },
      { label: "Oficina Mecânica" },
      { label: "Funilaria & Pintura" },
      { label: "Lava-Rápido & Estética Automotiva" },
      { label: "📝 Outro (Digitar Ramo Customizado)" },
    ],
  },
  {
    id: "eventos_gastronomia",
    icon: "🎉",
    label: "Eventos, Gastronomia e Festas",
    branches: [
      { label: "Buffet & Eventos" },
      { label: "Decoração de Festas" },
      { label: "Confeitaria" },
      { label: "📝 Outro (Digitar Ramo Customizado)" },
    ],
  },
];

/** Marcador que indica ramo customizado — para o seletor mostrar input livre. */
export const CUSTOM_BRANCH_MARKER = "📝 Outro (Digitar Ramo Customizado)";

/** Retorna todos os labels (ramos + subcategorias) como lista plana para busca. */
export function flattenBranches(): string[] {
  const out: string[] = [];
  for (const cat of ACTIVITY_MATRIX) {
    for (const b of cat.branches) {
      out.push(b.label);
      if (b.subcategories) out.push(...b.subcategories);
    }
  }
  return out;
}
