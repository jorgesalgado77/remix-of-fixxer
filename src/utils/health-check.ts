import { supabase } from '@/integrations/supabase/client';

export const checkSupabaseHealth = async () => {
  try {
    // Tenta uma consulta simples para validar a conexão
    const { error } = await supabase.from('profiles').select('id', { count: 'exact', head: true }).limit(1);
    
    if (error) {
      // Se o erro for de falta de chave ou URL inválida
      if (error.message.includes('apiKey') || error.message.includes('failed to fetch')) {
        return { 
          ok: false, 
          error: 'Configuração do Supabase inválida ou inacessível. Verifique a URL e a Anon Key.' 
        };
      }
      // Outros erros (como RLS ou tabela não existente) ainda indicam que a conexão "está viva"
      return { ok: true, warning: error.message };
    }
    
    return { ok: true };
  } catch (err: any) {
    console.error('Supabase Health Check Failed:', err);
    return { 
      ok: false, 
      error: 'Falha crítica na conexão com o Supabase. Verifique sua rede e as variáveis de ambiente.' 
    };
  }
};
