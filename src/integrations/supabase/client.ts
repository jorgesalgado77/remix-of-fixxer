import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://rnhgpxembtgupxnrohxo.supabase.co';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJuaGdweGVtYnRndXB4bnJvaHhvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ1NTk3NjQsImV4cCI6MjEwMDEzNTc2NH0.qqZxpJKYzuK48EawEDMamXA2Cy2YVOB0RV0-CgsSwMA';

if (!import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_ANON_KEY) {
  console.warn('[FIXXER Supabase]: Utilizando credenciais de fallback (Hardcoded).');
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});
