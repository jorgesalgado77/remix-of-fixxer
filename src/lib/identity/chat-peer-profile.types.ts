export type PeerProfile = {
  id: string;
  name: string;
  initials: string;
  avatarUrl: string | null;
  role: string | null;
  isFallback: boolean;
  source: string[];
  diagnostics: string[];
};
