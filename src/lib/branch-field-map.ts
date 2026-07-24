import { ACTIVITY_MATRIX, findMacroForBranch } from "@/lib/activity-branches";

export type MacroFieldConfig = {
  /** Rótulo do "tipo de chamado" exibido no CreateAdModal/Chat. */
  callType: string;
  /** Rótulo do campo de prazo (data limite / diagnóstico / evento). */
  deadlineLabel: string;
  /** Rótulo do campo "data de início" (visita, retirada, evento). */
  startLabel: string;
  /** Rótulo do compromisso na agenda para essa macro. */
  appointmentLabel: string;
  /** Placeholder do campo de descrição, contextualizado para a macro. */
  descriptionPlaceholder: string;
};

const DEFAULT_MAP: MacroFieldConfig = {
  callType: "Solicitação de Serviço",
  deadlineLabel: "Prazo de Execução",
  startLabel: "Data de Início",
  appointmentLabel: "Compromisso",
  descriptionPlaceholder: "Descreva o serviço solicitado, materiais e requisitos.",
};

export const BRANCH_FIELD_MAP: Record<string, Partial<MacroFieldConfig>> = {
  manutencao_tech: {
    callType: "Chamado Técnico",
    deadlineLabel: "Prazo de Diagnóstico",
    startLabel: "Data de Abertura",
    appointmentLabel: "Atendimento Técnico",
    descriptionPlaceholder: "Descreva o defeito, modelo do equipamento e sintomas.",
  },
  manutencao_servicos: {
    callType: "Ordem de Serviço",
    deadlineLabel: "Prazo de Conclusão",
    appointmentLabel: "Visita Técnica",
    descriptionPlaceholder: "Detalhe o serviço (elétrica, hidráulica, etc.) e materiais.",
  },
  imobiliario: {
    callType: "Visita / Vistoria",
    startLabel: "Data da Visita",
    deadlineLabel: "Prazo de Entrega do Laudo",
    appointmentLabel: "Vistoria de Imóvel",
    descriptionPlaceholder: "Endereço completo, tipo de imóvel e escopo da vistoria.",
  },
  vestuario_moda: {
    callType: "Pedido de Ajuste/Peça",
    deadlineLabel: "Prazo de Entrega",
    appointmentLabel: "Retirada / Prova",
    descriptionPlaceholder: "Peça, tamanho, tipo de ajuste ou personalização.",
  },
  gas_agua_entregas: {
    callType: "Solicitação de Entrega",
    deadlineLabel: "Prazo de Entrega",
    startLabel: "Janela de Entrega",
    appointmentLabel: "Entrega",
    descriptionPlaceholder: "Quantidade, tipo (P13, água 20L) e ponto de entrega.",
  },
  fitness_esportes: {
    callType: "Solicitação de Aula/Plano",
    deadlineLabel: "Data de Início do Plano",
    appointmentLabel: "Sessão de Treino",
    descriptionPlaceholder: "Modalidade, objetivo, restrições e horário preferido.",
  },
  moveis_reformas: {
    callType: "Projeto / Ordem de Obra",
    deadlineLabel: "Prazo de Execução",
    appointmentLabel: "Medição / Montagem",
    descriptionPlaceholder: "Ambientes, medidas e materiais desejados.",
  },
  beleza_estetica: {
    callType: "Agendamento",
    startLabel: "Data do Procedimento",
    deadlineLabel: "Retorno / Manutenção",
    appointmentLabel: "Atendimento de Beleza",
    descriptionPlaceholder: "Procedimento desejado, alergias e preferências.",
  },
  pet_veterinaria: {
    callType: "Consulta / Serviço Pet",
    startLabel: "Data do Atendimento",
    appointmentLabel: "Atendimento Pet",
    descriptionPlaceholder: "Espécie, porte, sintomas ou serviço solicitado.",
  },
  saude_cuidados: {
    callType: "Consulta / Procedimento",
    startLabel: "Data da Consulta",
    appointmentLabel: "Atendimento Clínico",
    descriptionPlaceholder: "Motivo da consulta, histórico e convênio se houver.",
  },
  logistica_veiculos: {
    callType: "Ordem de Frete/Serviço",
    startLabel: "Data de Coleta",
    deadlineLabel: "Prazo de Entrega/Retirada",
    appointmentLabel: "Coleta / Serviço",
    descriptionPlaceholder: "Origem, destino, volumes, veículo e condições.",
  },
  eventos_gastronomia: {
    callType: "Reserva de Evento",
    startLabel: "Data do Evento",
    deadlineLabel: "Prazo de Confirmação",
    appointmentLabel: "Evento",
    descriptionPlaceholder: "Tipo do evento, nº de convidados, cardápio e local.",
  },
};

/**
 * Resolve a configuração de campos para uma lista de ramos do usuário.
 * Usa o primeiro ramo com macro conhecida; senão devolve o padrão.
 */
export function getFieldConfigForBranches(branches: string[]): MacroFieldConfig {
  for (const b of branches) {
    const macro = findMacroForBranch(b);
    if (macro && BRANCH_FIELD_MAP[macro.id]) {
      return { ...DEFAULT_MAP, ...BRANCH_FIELD_MAP[macro.id] };
    }
  }
  return DEFAULT_MAP;
}

/** Lista de todas as macros (para chips). */
export function listMacros() {
  return ACTIVITY_MATRIX.map((m) => ({ id: m.id, icon: m.icon, label: m.label }));
}
