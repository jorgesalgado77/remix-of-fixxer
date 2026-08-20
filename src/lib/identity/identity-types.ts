import type { PublicProfileCategory } from "@/lib/public-profile-category";

/** 
 * Identidade Canônica do FIXXER.
 * Dados básicos e imutáveis de apresentação.
 */
export interface CanonicalIdentity {
  id: string;
  displayName: string;
  fullName: string | null;
  email: string | null;
  avatarUrl: string | null;
  bio: string | null;
  isOfficial: boolean;
  isVerified: boolean;
  planId: string;
  createdAt: string;
  planRenewsAt: string | null;
  karmaScore?: number;
  lastActiveAt: string | null;
  verificationStatus: "none" | "pending" | "verified" | "rejected";
  verificationNote?: string | null;
}

/**
 * Apresentação Consistente.
 * Como o usuário deve ser renderizado na UI.
 */
export interface ProfilePresentation {
  name: string;
  initials: string;
  avatarUrl: string | null;
  category: PublicProfileCategory;
  themeColor: string;
  label: string;
  badges: string[];
  activityLabel: string;
}

/**
 * Objeto Completo de Perfil Resolvido.
 */
export interface ResolvedProfile {
  identity: CanonicalIdentity;
  roles: string[];
  mainCategory: PublicProfileCategory;
  presentation: ProfilePresentation;
  specializations: {
    store?: any;
    provider?: any;
    supplier?: any;
  };
}
