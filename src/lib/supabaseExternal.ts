import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('[FIXXER External Supabase]: Chaves de API não encontradas no .env');
}

export const supabaseExternal = createClient(
  SUPABASE_URL || '',
  SUPABASE_ANON_KEY || '',
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      storageKey: 'fixxer-auth-token-v1',
    },
    global: {
      headers: { 'x-application-name': 'fixxer-hub' },
    },
    // Configurações de Realtime para maior resiliência
    realtime: {
      params: {
        eventsPerSecond: 10,
      },
    },
  }
);
