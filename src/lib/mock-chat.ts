/**
 * FIXXER — Stub vazio de mock-chat.
 * ---------------------------------
 * Os mocks de conversa/perfil foram removidos por ordem de auditoria.
 * Este arquivo mantém apenas os TIPOS e funções vazias para não quebrar
 * os imports existentes em `_authenticated.chat.tsx`,
 * `_authenticated.chat.$peerId.tsx` e `LojistaPublicProfilePage.tsx`
 * enquanto a migração completa não é feita. Todas as funções retornam
 * "não existe mock", garantindo que os caminhos reais (Supabase) sejam
 * sempre percorridos.
 *
 * ⚠️ NÃO ADICIONE DADOS MOCK AQUI. Se precisar de exemplos, use fixtures
 * de teste em `src/tests/`.
 */

export type MockMessage = {
  id: string;
  fromMe: boolean;
  content: string;
  minutesAgo: number;
  attachment?: { url: string; type: string; name: string };
};

export type MockLinkedAd = {
  title: string;
  category: string;
  distanceKm?: number;
  price?: number;
  priceMin?: number;
  priceMax?: number;
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
  memberSince: string;
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

export type MockConversation = {
  peerId: string;
  peerName: string;
  peerRole: string;
  peerAvatar: string | null;
  online?: boolean;
  messages: MockMessage[];
  profile?: MockProfile;
  linkedAd?: MockLinkedAd;
};

/** Lista de conversas mock — VAZIA após auditoria. */
export const MOCK_CONVERSATIONS: MockConversation[] = [];

/** Timestamp helper mantido pois é usado por outros lugares como utilitário puro. */
export function mockMessageIsoAt(minutesAgo: number): string {
  return new Date(Date.now() - minutesAgo * 60_000).toISOString();
}

/** Sempre `false` — não há mais IDs mock reconhecidos. */
export function isMockPeerId(_peerId: string | null | undefined): boolean {
  return false;
}

export function getMockConversation(_peerId: string): MockConversation | null {
  return null;
}

export function getMockProfile(_peerId: string): MockProfile | null {
  return null;
}

export function getMockPeerName(_peerId: string): string | null {
  return null;
}

export function getMockPeerAvatar(_peerId: string): string | null {
  return null;
}
