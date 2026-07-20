import { createClient } from '@supabase/supabase-js';

// URL do banco de dados externo fornecida pelo usuário
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://rnhgpxembtgupxnrohxo.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJuaGdweGVtYnRndXB4bnJvaHhvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ1NTk3NjQsImV4cCI6MjEwMDEzNTc2NH0.qqZxpJKYzuK48EawEDMamXA2Cy2YVOB0RV0-CgsSwMA';

if (!supabaseUrl) {
  console.warn('VITE_SUPABASE_URL is missing.');
}
if (supabaseAnonKey.includes('YOUR_SUPABASE_ANON_KEY')) {
  console.warn('VITE_SUPABASE_ANON_KEY is missing.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
