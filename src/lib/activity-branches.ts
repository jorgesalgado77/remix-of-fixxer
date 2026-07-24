// ============================================================
// FIXXER — Matriz Multi-Setorial de Ramos de Atividade
// Fonte única de verdade para cadastro, perfis, feeds e afiliados
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

/** Marcador que indica ramo customizado — para o seletor mostrar input livre. */
export const CUSTOM_BRANCH_MARKER = "📝 Outro (Digitar Ramo Customizado)";

export const ACTIVITY_MATRIX: ActivityMacroCategory[] = [
  {
    id: "manutencao_tech",
    icon: "⚡",
    label: "Manutenção, Tecnologia & Assistência Técnica",
    branches: [
      {
        label: "Assistência Técnica de Celulares & Tablets",
        subcategories: [
          "Troca de Tela / Vidro",
          "Microsoldagem / Placa",
          "Troca de Bateria",
          "Desbloqueio / Software",
        ],
      },
      {
        label: "Informática & Computadores",
        subcategories: [
          "Formatação / SSD",
          "Manutenção de Notebooks",
          "Montagem de PC Gamer",
          "Redes / Servidores",
          "Recuperação de Dados",
        ],
      },
      {
        label: "Linha Branca & Eletrodomésticos",
        subcategories: [
          "Geladeiras / Refrigeração",
          "Máquinas de Lavar / Lava e Seca",
          "Fogões / Gás Encanado",
          "Micro-ondas",
        ],
      },
      {
        label: "Eletrônicos & Áudio/Vídeo",
        subcategories: [
          "Smart TVs",
          "Consoles / Video Games",
          "Som / Amplificadores",
        ],
      },
      { label: CUSTOM_BRANCH_MARKER },
    ],
  },
  {
    id: "manutencao_servicos",
    icon: "🔧",
    label: "Manutenção, Instalações e Serviços Gerais",
    branches: [
      { label: "Elétrica & Automação" },
      { label: "Hidráulica & Encanamento" },
      { label: "Ar-Condicionado" },
      { label: "Serralheria" },
      { label: "Marido de Aluguel" },
      { label: "Limpeza & Conservação (Diarista / Pós-Obra)" },
      { label: "Segurança Eletrônica / CFTV" },
      { label: CUSTOM_BRANCH_MARKER },
    ],
  },
  {
    id: "imobiliario",
    icon: "🏢",
    label: "Setor Imobiliário, Condomínios & Imóveis",
    branches: [
      {
        label: "Imobiliárias, Administradoras & Corretores",
        subcategories: [
          "Vistoria Imobiliária",
          "Fotografia de Imóveis",
          "Limpeza Pós-Mudança",
          "Chaveiro",
          "Corretor Autônomo",
          "Síndico Profissional",
          "Administradora de Condomínios",
        ],
      },
      { label: CUSTOM_BRANCH_MARKER },
    ],
  },
  {
    id: "vestuario_moda",
    icon: "👗",
    label: "Vestuário, Moda, Sapataria & Brechós",
    branches: [
      {
        label: "Lojas de Roupas, Brechós & Bazares",
        subcategories: [
          "Costureira / Alfaiate",
          "Sapatista / Ajustes",
          "Entregador / Motoboy",
          "Passadeira",
          "Bordadeira / Personalização",
        ],
      },
      { label: CUSTOM_BRANCH_MARKER },
    ],
  },
  {
    id: "gas_agua_entregas",
    icon: "💧",
    label: "Gás, Água & Entregas Rápidas",
    branches: [
      {
        label: "Depósitos de Gás & Água Mineral",
        subcategories: [
          "Gasista / Instalador de Regulador",
          "Motoboy Freelancer",
          "Entregador de Galões",
        ],
      },
      { label: CUSTOM_BRANCH_MARKER },
    ],
  },
  {
    id: "fitness_esportes",
    icon: "🏋️‍♂️",
    label: "Academias, Fitness & Esportes",
    branches: [
      {
        label: "Academias, Studios & Personal Trainers",
        subcategories: [
          "Personal Trainer",
          "Instrutor de Pilates",
          "Nutricionista Esportivo",
          "Massoterapeuta",
          "Crossfit / Funcional",
          "Yoga",
        ],
      },
      { label: CUSTOM_BRANCH_MARKER },
    ],
  },
  {
    id: "moveis_reformas",
    icon: "🏠",
    label: "Móveis, Decoração e Reformas",
    branches: [
      { label: "Móveis Planejados & Marcenaria" },
      { label: "Marmoraria" },
      { label: "Vidraçaria" },
      { label: "Construção Civil & Reformas" },
      { label: "Gesso / Drywall" },
      { label: "Pintura" },
      { label: "Arquitetura & Engenharia" },
      { label: CUSTOM_BRANCH_MARKER },
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
      { label: CUSTOM_BRANCH_MARKER },
    ],
  },
  {
    id: "pet_veterinaria",
    icon: "🐶",
    label: "Pet Shop & Veterinária",
    branches: [
      { label: "Clínica Veterinária & Hospital Pet" },
      { label: "Pet Shop & Banho e Tosa (Groomer)" },
      { label: "Adestramento & Dog Walker" },
      { label: "Casa de Ração" },
      { label: CUSTOM_BRANCH_MARKER },
    ],
  },
  {
    id: "saude_cuidados",
    icon: "🩺",
    label: "Saúde, Odontologia & Cuidados Pessoais",
    branches: [
      { label: "Consultório Odontológico" },
      { label: "Clínica Médica" },
      { label: "Fisioterapia" },
      { label: "Cuidador de Idosos / Enfermagem" },
      { label: CUSTOM_BRANCH_MARKER },
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
      { label: CUSTOM_BRANCH_MARKER },
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
      { label: CUSTOM_BRANCH_MARKER },
    ],
  },
];

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

/** Localiza a Macro-Categoria de um ramo/subcategoria específico. */
export function findMacroForBranch(branchOrSub: string): ActivityMacroCategory | null {
  const needle = branchOrSub.trim().toLowerCase();
  for (const cat of ACTIVITY_MATRIX) {
    for (const b of cat.branches) {
      if (b.label.toLowerCase() === needle) return cat;
      if (b.subcategories?.some((s) => s.toLowerCase() === needle)) return cat;
    }
  }
  return null;
}

// ============================================================
// MATRIZ B2B — Sugestões cruzadas de afiliados/parcerias por ramo
// Cada chave é um ramo (ou macro-id) e o valor é uma lista de
// oportunidades de parceria/comissão sugeridas no Feed.
// ============================================================

export type B2BSuggestion = {
  icon: string;
  title: string;
  hint: string;
  /** Ramo-alvo sugerido para busca no feed. */
  targetBranch?: string;
};

export const B2B_SUGGESTIONS: Record<string, B2BSuggestion[]> = {
  // Assistência técnica
  "Assistência Técnica de Celulares & Tablets": [
    { icon: "📦", title: "Distribuidores de peças (telas, baterias)", hint: "Ganhe comissão em cada indicação B2B", targetBranch: "Depósitos de Gás & Água Mineral" },
    { icon: "🛡️", title: "Seguradoras de dispositivos", hint: "Parceria com apólice para clientes finais" },
  ],
  "Linha Branca & Eletrodomésticos": [
    { icon: "🧊", title: "Distribuidores de compressores & gás refrigerante", hint: "Comissão por indicação de fornecedor" },
    { icon: "🏪", title: "Lojistas com garantia estendida", hint: "Ofereça manutenção como benefício" },
  ],
  "Informática & Computadores": [
    { icon: "💾", title: "Fornecedores de SSD, memórias e periféricos", hint: "Kit de reposição com comissão" },
    { icon: "🎮", title: "Lojas de PC Gamer & Setup", hint: "Indicação cruzada de clientes" },
  ],
  "Eletrônicos & Áudio/Vídeo": [
    { icon: "🔊", title: "Distribuidores de peças de áudio/vídeo", hint: "Parceria B2B com comissão" },
  ],
  // Imobiliário
  "Imobiliárias, Administradoras & Corretores": [
    { icon: "📸", title: "Fotógrafos de Imóveis locais", hint: "Pacote de fotos com comissão" },
    { icon: "🔑", title: "Chaveiros 24h", hint: "Parceria para entrega de chaves" },
    { icon: "🧹", title: "Diaristas / Limpeza Pós-Mudança", hint: "Encaminhe clientes e receba comissão" },
    { icon: "📐", title: "Vistoriadores Imobiliários", hint: "Laudos com comissão por indicação" },
  ],
  // Vestuário
  "Lojas de Roupas, Brechós & Bazares": [
    { icon: "🪡", title: "Costureiras & Alfaiates", hint: "Ajustes com comissão para lojistas" },
    { icon: "🥿", title: "Sapatistas para ajustes finos", hint: "Parceria de manutenção pós-venda" },
    { icon: "🏍️", title: "Motoboys freelancers", hint: "Rede de entregas rápidas" },
  ],
  // Gás e água
  "Depósitos de Gás & Água Mineral": [
    { icon: "🔧", title: "Gasistas certificados", hint: "Instalação com comissão do depósito" },
    { icon: "🏍️", title: "Entregadores autônomos", hint: "Amplie sua frota sem CLT" },
  ],
  // Fitness
  "Academias, Studios & Personal Trainers": [
    { icon: "🥗", title: "Marmitarias fit & Nutricionistas", hint: "Comissão por indicação de plano" },
    { icon: "💊", title: "Lojas de Suplementos", hint: "Cupom exclusivo com comissão" },
    { icon: "🧘", title: "Studios de Pilates / Yoga", hint: "Cross-selling entre modalidades" },
  ],
  // Móveis / reformas
  "Móveis Planejados & Marcenaria": [
    { icon: "🪨", title: "Marmoraria parceira", hint: "Pacote cozinha completa" },
    { icon: "🪟", title: "Vidraçarias locais", hint: "Portas de vidro sob medida" },
    { icon: "🎨", title: "Pintores & Gesseiros", hint: "Encaminhamento com comissão" },
  ],
  "Construção Civil & Reformas": [
    { icon: "🧱", title: "Fornecedores de materiais", hint: "Comissão por volume de indicações" },
    { icon: "🏗️", title: "Caçambas & Entulho", hint: "Reserva rápida com comissão" },
  ],
  // Beleza
  "Salão de Beleza & Cabelo": [
    { icon: "🧴", title: "Distribuidores de cosméticos profissionais", hint: "Kit de trabalho com comissão" },
    { icon: "💅", title: "Manicures freelancers", hint: "Compartilhe agenda e ganhe %" },
  ],
  // Pet
  "Clínica Veterinária & Hospital Pet": [
    { icon: "🦴", title: "Casas de Ração parceiras", hint: "Programa de fidelidade cruzado" },
    { icon: "✂️", title: "Groomers freelancers", hint: "Comissão em pacotes de banho" },
  ],
  // Saúde
  "Consultório Odontológico": [
    { icon: "🧪", title: "Laboratórios de prótese", hint: "Comissão por caso indicado" },
    { icon: "🏥", title: "Convênios odontológicos", hint: "Aumente sua carteira" },
  ],
  // Logística
  "Fretes / Mudanças": [
    { icon: "📦", title: "Empresas de embalagem", hint: "Kit mudança com comissão" },
    { icon: "🏢", title: "Imobiliárias locais", hint: "Indicação recíproca de clientes" },
  ],
};

/** Retorna sugestões B2B relevantes para uma lista de ramos do usuário. */
export function getB2BSuggestions(userBranches: string[]): B2BSuggestion[] {
  const seen = new Set<string>();
  const out: B2BSuggestion[] = [];
  for (const raw of userBranches) {
    const key = raw.trim();
    const list = B2B_SUGGESTIONS[key];
    if (!list) continue;
    for (const s of list) {
      if (seen.has(s.title)) continue;
      seen.add(s.title);
      out.push(s);
    }
  }
  return out;
}
