import { createClient } from '@supabase/supabase-js';

// URL do banco de dados externo fornecida pelo usuário
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://rnhgpxembtgupxnrohxo.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
