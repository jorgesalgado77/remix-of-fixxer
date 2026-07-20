import { createClient } from '@supabase/supabase-js';

// URL do banco de dados externo fornecida pelo usuário
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://rnhgpxembtgupxnrohxo.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'YOUR_SUPABASE_ANON_KEY_HERE';

if (!supabaseUrl) {
  console.warn('VITE_SUPABASE_URL is missing. Please check your environment variables.');
}
if (supabaseAnonKey === 'YOUR_SUPABASE_ANON_KEY_HERE') {
  console.warn('VITE_SUPABASE_ANON_KEY is missing. Please check your environment variables.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
