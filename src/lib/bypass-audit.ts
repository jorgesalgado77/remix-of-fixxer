import { supabaseExternal } from "@/lib/supabaseExternal";

/**
 * Audit Service para o modo Master Bypass
 * Garante que os dados do banco externo sejam carregados corretamente 
 * e que as permissões estejam alinhadas com as políticas do Supabase externo.
 */

export async function auditBypassAccess() {
  const isMaster = typeof window !== 'undefined' && localStorage.getItem('fixxer:master-bypass') === 'true';
  const cat = typeof window !== 'undefined' ? localStorage.getItem('fixxer:last-category') : null;
  const uid = isMaster ? (cat === 'admin' ? '6ba65048-803f-44f6-88d2-24d04fee1a0f' : 'b3378b88-5c46-4e50-9c2e-4b7264a4d6e9') : null;

  if (!uid) return { ok: false, error: "Bypass inativo ou UID não encontrado" };

  console.log(`[BypassAudit] Iniciando auditoria para ${cat} (ID: ${uid}) no Supabase Externo`);

  try {
    // 1. Verificar Perfil no Banco
    const { data: profile, error: pErr } = await supabaseExternal
      .from('profiles')
      .select('id, display_name, karma_score, plan_id, avatar_url, city, state')
      .eq('id', uid)
      .maybeSingle();

    if (pErr) throw pErr;

    // 2. Verificar Moedas
    const { data: coins, error: cErr } = await supabaseExternal
      .from('user_coins')
      .select('balance')
      .eq('user_id', uid)
      .maybeSingle();

    if (cErr) throw cErr;

    // 3. Verificar Roles
    const { data: roles, error: rErr } = await supabaseExternal
      .from('user_roles')
      .select('role')
      .eq('user_id', uid);

    if (rErr) throw rErr;

    return {
      ok: true,
      profile: profile || "Não encontrado (usando mock síncrono)",
      coins: coins || "Não encontrado (saldo zerado)",
      roles: roles || [],
      supabaseUrl: import.meta.env.VITE_SUPABASE_URL
    };
  } catch (err: any) {
    console.error("[BypassAudit] Falha na auditoria de conexão:", err);
    return { ok: false, error: err.message };
  }
}
