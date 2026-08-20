import { supabaseExternal } from "./src/lib/supabaseExternal.ts";

async function check() {
  // Tentar buscar o esquema via consulta direta às tabelas de sistema do postgres
  const { data, error } = await supabaseExternal.rpc('get_table_columns', { table_name: 'profiles' });
  
  if (error) {
    // Se a RPC não existir, tentamos uma query bruta
    console.log("RPC get_table_columns não existe, tentando query direta...");
    const { data: cols, error: err } = await supabaseExternal.from("profiles").select("*").limit(0);
    if (err) {
      console.error("Erro ao tentar ler colunas de profiles:", err);
    } else {
      console.log("Colunas detectadas via select (limit 0):", cols);
    }
  } else {
    console.log("Colunas de profiles via RPC:", data);
  }
}

check();
