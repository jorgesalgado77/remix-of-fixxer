// Conversas fake para demonstração do fluxo de chat.
// Os IDs começam com "mock-" para serem detectados nas páginas de chat
// e nunca atingirem o banco.

export type MockMessage = {
  id: string;
  fromMe: boolean;
  content: string;
  minutesAgo: number; // relativo a "agora"
};

export type MockConversation = {
  peerId: string; // sempre começa com "mock-"
  peerName: string;
  peerRole: string; // "prestador" | "fornecedor" | "cliente" | "lojista"
  peerAvatar: string | null;
  online?: boolean;
  messages: MockMessage[];
  profile?: MockProfile;
};

export type MockProfile = {
  companyName?: string;
  bio: string;
  city: string;
  state: string;
  whatsapp: string;
  bannerUrl: string;
  gallery: string[];
  videos?: string[];
  activityBranch: string;
  rating: number;
  reviewsCount: number;
  yearsActive: number;
  memberSince: string; // ISO
  specialties: string[];
  reviews: {
    id: string;
    reviewer_name: string;
    reviewer_city?: string;
    reviewer_category: "cliente" | "prestador" | "fornecedor";
    reviewer_avatar?: string | null;
    rating: number;
    comment: string;
    created_at: string;
  }[];
};

export const MOCK_CONVERSATIONS: MockConversation[] = [
  {
    peerId: "mock-carlos-conferente",
    peerName: "Carlos Silva — Conferente Ouro",
    peerRole: "prestador",
    peerAvatar:
      "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=200&q=80&auto=format&fit=crop",
    online: true,
    messages: [
      { id: "m1", fromMe: false, minutesAgo: 180, content: "Olá! Vi seu pedido de repasse em Alphaville, tenho interesse." },
      { id: "m2", fromMe: true, minutesAgo: 175, content: "Perfeito, Carlos. Você tem disponibilidade para 3ª feira?" },
      { id: "m3", fromMe: false, minutesAgo: 172, content: "Tenho sim. Posso fazer a conferência das medidas antes, sem custo extra." },
      { id: "m4", fromMe: true, minutesAgo: 170, content: "Ótimo. Envio o projeto executivo em PDF ainda hoje." },
      { id: "m5", fromMe: false, minutesAgo: 45, content: "Fechado! Aguardo o projeto. Já bloqueei minha agenda." },
      { id: "m6", fromMe: false, minutesAgo: 12, content: "Aliás, precisa de fretista parceiro? Trabalho com um de confiança." },
    ],
  },
  {
    peerId: "mock-marmoraria",
    peerName: "Marmoraria Granitos & Arte",
    peerRole: "fornecedor",
    peerAvatar:
      "https://images.unsplash.com/photo-1615529182904-14819c35db37?w=200&q=80&auto=format&fit=crop",
    online: false,
    messages: [
      { id: "m1", fromMe: true, minutesAgo: 1440, content: "Bom dia! Preciso de cotação de tampo em mármore branco 2,40m x 0,65m." },
      { id: "m2", fromMe: false, minutesAgo: 1430, content: "Bom dia! Temos em estoque. R$ 1.180 com corte, polimento e cuba embutida." },
      { id: "m3", fromMe: true, minutesAgo: 1425, content: "Prazo de entrega em Sorocaba?" },
      { id: "m4", fromMe: false, minutesAgo: 1420, content: "5 dias úteis. Se fechar hoje, entrego na 6ª sem custo de frete." },
      { id: "m5", fromMe: false, minutesAgo: 300, content: "Consegue confirmar o pedido para eu já reservar a chapa?" },
    ],
  },
  {
    peerId: "mock-mariana-cliente",
    peerName: "Mariana Souza",
    peerRole: "cliente",
    peerAvatar:
      "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&q=80&auto=format&fit=crop",
    online: true,
    messages: [
      { id: "m1", fromMe: false, minutesAgo: 60, content: "Oi! Vocês fazem projeto de dormitório planejado sob medida?" },
      { id: "m2", fromMe: true, minutesAgo: 58, content: "Olá, Mariana! Fazemos sim. Você já tem as medidas ou prefere agendar visita técnica?" },
      { id: "m3", fromMe: false, minutesAgo: 55, content: "Prefiro agendar. Moro na região central de Sorocaba." },
      { id: "m4", fromMe: true, minutesAgo: 50, content: "Perfeito. Amanhã de manhã ou tarde?" },
      { id: "m5", fromMe: false, minutesAgo: 8, content: "Tarde, por favor 🙌 Após as 14h." },
    ],
  },
  {
    peerId: "mock-bianchi-lojista",
    peerName: "Móveis Bianchi (Parceria)",
    peerRole: "lojista",
    peerAvatar:
      "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=200&q=80&auto=format&fit=crop",
    online: false,
    messages: [
      { id: "m1", fromMe: false, minutesAgo: 2880, content: "Fala! Estamos com agenda cheia em Jundiaí, topa pegar 3 O.S. de montagem?" },
      { id: "m2", fromMe: true, minutesAgo: 2870, content: "Topo! Qual a comissão e prazo?" },
      { id: "m3", fromMe: false, minutesAgo: 2860, content: "50/50 no valor da O.S. e prazo de 10 dias para finalizar as três." },
      { id: "m4", fromMe: true, minutesAgo: 400, content: "Fechado. Manda os endereços e projetos que já monto a rota." },
    ],
  },
  {
    peerId: "mock-julio-assistencia",
    peerName: "Júlio Menezes",
    peerRole: "cliente",
    peerAvatar: null,
    online: false,
    messages: [
      { id: "m1", fromMe: false, minutesAgo: 42, content: "Boa tarde, a porta do armário da cozinha desalinhou. Vocês fazem assistência técnica?" },
      { id: "m2", fromMe: true, minutesAgo: 40, content: "Boa tarde! Fazemos sim. Custo mínimo de visita é R$ 120, abatido no orçamento se aceito." },
      { id: "m3", fromMe: false, minutesAgo: 3, content: "Pode ser amanhã? Estou em Votorantim." },
    ],
  },
];

const nowMs = () => Date.now();

export function mockMessageIsoAt(minutesAgo: number): string {
  return new Date(nowMs() - minutesAgo * 60_000).toISOString();
}

export function isMockPeerId(peerId: string | null | undefined): boolean {
  return !!peerId && peerId.startsWith("mock-");
}

export function getMockConversation(peerId: string): MockConversation | null {
  return MOCK_CONVERSATIONS.find((c) => c.peerId === peerId) ?? null;
}
