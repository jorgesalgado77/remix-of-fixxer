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

const IMG = (id: string, w = 600) =>
  `https://images.unsplash.com/${id}?w=${w}&q=80&auto=format&fit=crop`;

export const MOCK_CONVERSATIONS: MockConversation[] = [
  {
    peerId: "mock-carlos-conferente",
    peerName: "Carlos Silva — Conferente Ouro",
    peerRole: "prestador",
    peerAvatar: IMG("photo-1544005313-94ddf0286df2", 200),
    online: true,
    messages: [
      { id: "m1", fromMe: false, minutesAgo: 180, content: "Olá! Vi seu pedido de repasse em Alphaville, tenho interesse." },
      { id: "m2", fromMe: true, minutesAgo: 175, content: "Perfeito, Carlos. Você tem disponibilidade para 3ª feira?" },
      { id: "m3", fromMe: false, minutesAgo: 172, content: "Tenho sim. Posso fazer a conferência das medidas antes, sem custo extra." },
      { id: "m4", fromMe: true, minutesAgo: 170, content: "Ótimo. Envio o projeto executivo em PDF ainda hoje." },
      { id: "m5", fromMe: false, minutesAgo: 45, content: "Fechado! Aguardo o projeto. Já bloqueei minha agenda." },
      { id: "m6", fromMe: false, minutesAgo: 12, content: "Aliás, precisa de fretista parceiro? Trabalho com um de confiança." },
    ],
    profile: {
      bio: "Conferente Ouro FIXXER com 8 anos em conferência, montagem e repasse de projetos planejados. Especialista em Alphaville e Grande São Paulo.",
      city: "Barueri", state: "SP", whatsapp: "11987650001",
      bannerUrl: IMG("photo-1503387762-592deb58ef4e", 1400),
      gallery: [
        IMG("photo-1600585154340-be6161a56a0c"),
        IMG("photo-1600607687939-ce8a6c25118c"),
        IMG("photo-1616486338812-3dadae4b4ace"),
        IMG("photo-1600566753190-17f0baa2a6c3"),
      ],
      activityBranch: "Montagem & Conferência",
      rating: 4.9, reviewsCount: 127, yearsActive: 8,
      memberSince: "2018-03-10T00:00:00Z",
      specialties: ["Cozinhas Planejadas", "Dormitórios", "Home Office", "Repasse Ouro"],
      reviews: [
        { id: "r1", reviewer_name: "Móveis Rocha", reviewer_city: "Osasco/SP", reviewer_category: "cliente", reviewer_avatar: IMG("photo-1494790108377-be9c29b29330", 100), rating: 5, comment: "Serviço impecável. Chegou no horário, montou 3 ambientes em 1 dia.", created_at: new Date(Date.now()-86400000*7).toISOString() },
        { id: "r2", reviewer_name: "Ana Prestes", reviewer_city: "Barueri/SP", reviewer_category: "cliente", reviewer_avatar: null, rating: 5, comment: "Muito atencioso, ajustou detalhes que nem tínhamos pedido.", created_at: new Date(Date.now()-86400000*20).toISOString() },
      ],
    },
  },
  {
    peerId: "mock-marmoraria",
    peerName: "Marmoraria Granitos & Arte",
    peerRole: "fornecedor",
    peerAvatar: IMG("photo-1615529182904-14819c35db37", 200),
    online: false,
    messages: [
      { id: "m1", fromMe: true, minutesAgo: 1440, content: "Bom dia! Preciso de cotação de tampo em mármore branco 2,40m x 0,65m." },
      { id: "m2", fromMe: false, minutesAgo: 1430, content: "Bom dia! Temos em estoque. R$ 1.180 com corte, polimento e cuba embutida." },
      { id: "m3", fromMe: true, minutesAgo: 1425, content: "Prazo de entrega em Sorocaba?" },
      { id: "m4", fromMe: false, minutesAgo: 1420, content: "5 dias úteis. Se fechar hoje, entrego na 6ª sem custo de frete." },
      { id: "m5", fromMe: false, minutesAgo: 300, content: "Consegue confirmar o pedido para eu já reservar a chapa?" },
    ],
    profile: {
      companyName: "Marmoraria Granitos & Arte",
      bio: "Fornecedor parceiro FIXXER — chapas de mármore, granito, quartzo e silestone. Corte, polimento e instalação sob medida.",
      city: "Sorocaba", state: "SP", whatsapp: "15991230002",
      bannerUrl: IMG("photo-1615529182904-14819c35db37", 1400),
      gallery: [
        IMG("photo-1600585154340-be6161a56a0c"),
        IMG("photo-1615873968403-89e068629265"),
        IMG("photo-1600607687644-c7171b42498f"),
      ],
      activityBranch: "Fornecedor de Mármores & Granitos",
      rating: 4.7, reviewsCount: 214, yearsActive: 15,
      memberSince: "2011-06-01T00:00:00Z",
      specialties: ["Tampos de Cozinha", "Bancadas de Banheiro", "Escadas", "Fachadas"],
      reviews: [
        { id: "r1", reviewer_name: "Confere Planejados", reviewer_category: "cliente", reviewer_avatar: null, rating: 5, comment: "Entrega no prazo, chapa perfeita.", created_at: new Date(Date.now()-86400000*3).toISOString() },
      ],
    },
  },
  {
    peerId: "mock-mariana-cliente",
    peerName: "Mariana Souza",
    peerRole: "cliente",
    peerAvatar: IMG("photo-1494790108377-be9c29b29330", 200),
    online: true,
    messages: [
      { id: "m1", fromMe: false, minutesAgo: 60, content: "Oi! Vocês fazem projeto de dormitório planejado sob medida?" },
      { id: "m2", fromMe: true, minutesAgo: 58, content: "Olá, Mariana! Fazemos sim. Você já tem as medidas ou prefere agendar visita técnica?" },
      { id: "m3", fromMe: false, minutesAgo: 55, content: "Prefiro agendar. Moro na região central de Sorocaba." },
      { id: "m4", fromMe: true, minutesAgo: 50, content: "Perfeito. Amanhã de manhã ou tarde?" },
      { id: "m5", fromMe: false, minutesAgo: 8, content: "Tarde, por favor 🙌 Após as 14h." },
    ],
    profile: {
      bio: "Cliente Final — reformando o apartamento novo em Sorocaba. Procurando dormitório planejado e cozinha compacta.",
      city: "Sorocaba", state: "SP", whatsapp: "15998760003",
      bannerUrl: IMG("photo-1505691938895-1758d7feb511", 1400),
      gallery: [IMG("photo-1560448204-e02f11c3d0e2"), IMG("photo-1522708323590-d24dbb6b0267")],
      activityBranch: "Cliente Final",
      rating: 5.0, reviewsCount: 3, yearsActive: 1,
      memberSince: "2025-02-14T00:00:00Z",
      specialties: ["Reforma Residencial", "Dormitório Planejado"],
      reviews: [],
    },
  },
  {
    peerId: "mock-bianchi-lojista",
    peerName: "Móveis Bianchi (Parceria)",
    peerRole: "lojista",
    peerAvatar: IMG("photo-1600607687939-ce8a6c25118c", 200),
    online: false,
    messages: [
      { id: "m1", fromMe: false, minutesAgo: 2880, content: "Fala! Estamos com agenda cheia em Jundiaí, topa pegar 3 O.S. de montagem?" },
      { id: "m2", fromMe: true, minutesAgo: 2870, content: "Topo! Qual a comissão e prazo?" },
      { id: "m3", fromMe: false, minutesAgo: 2860, content: "50/50 no valor da O.S. e prazo de 10 dias para finalizar as três." },
      { id: "m4", fromMe: true, minutesAgo: 400, content: "Fechado. Manda os endereços e projetos que já monto a rota." },
    ],
    profile: {
      companyName: "Móveis Bianchi",
      bio: "Loja parceira FIXXER — planejados premium em Jundiaí e região. Cozinhas, closets, home office e ambientes corporativos.",
      city: "Jundiaí", state: "SP", whatsapp: "11991230004",
      bannerUrl: IMG("photo-1600585154526-990dced4db0d", 1400),
      gallery: [
        IMG("photo-1616486338812-3dadae4b4ace"),
        IMG("photo-1600566753190-17f0baa2a6c3"),
        IMG("photo-1600607687939-ce8a6c25118c"),
        IMG("photo-1615873968403-89e068629265"),
      ],
      activityBranch: "Lojista de Planejados",
      rating: 4.8, reviewsCount: 342, yearsActive: 12,
      memberSince: "2014-08-01T00:00:00Z",
      specialties: ["Cozinhas Premium", "Closets", "Corporativo", "Repasse de O.S."],
      reviews: [
        { id: "r1", reviewer_name: "Carlos Silva", reviewer_category: "prestador", reviewer_avatar: IMG("photo-1544005313-94ddf0286df2", 100), rating: 5, comment: "Ótimo parceiro para repasses, paga em dia.", created_at: new Date(Date.now()-86400000*10).toISOString() },
      ],
    },
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
    profile: {
      bio: "Cliente residencial — pequenos ajustes e assistência técnica em móveis planejados existentes.",
      city: "Votorantim", state: "SP", whatsapp: "15997770005",
      bannerUrl: IMG("photo-1493809842364-78817add7ffb", 1400),
      gallery: [IMG("photo-1600585154340-be6161a56a0c")],
      activityBranch: "Cliente Final",
      rating: 4.5, reviewsCount: 2, yearsActive: 2,
      memberSince: "2024-05-01T00:00:00Z",
      specialties: ["Assistência Técnica"],
      reviews: [],
    },
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
