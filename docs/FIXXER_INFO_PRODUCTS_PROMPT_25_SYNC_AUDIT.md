# FIXXER INFO PRODUCTS — PROMPT 25
## SYNC & IDENTITY ZERO-DEFECT AUDIT

### OBJETIVO
Implementar verificação proativa de existência de perfis especializados (`provider_profiles`), garantir consistência de permissões (RLS) para sincronização e criar monitoramento de status de identidade.

### 1. VERIFICAÇÃO DE INICIALIZAÇÃO
- **Local:** `src/lib/current-user.ts` e `src/lib/identity/identity-service.ts`.
- **Regra:** Se o usuário é categoria `prestador`, a ausência de `provider_profiles` deve disparar um evento global de erro de integridade.
- **UI:** Alertar o usuário sobre a necessidade de sincronização forçada caso a tabela base não responda.

### 2. MATRIZ DE PERMISSÕES (SQL RECOVERY)
- **RLS profiles:** `INSERT/UPDATE` permitido para `auth.uid() = id`.
- **RLS provider_profiles:** `INSERT/UPDATE` permitido para `auth.uid() = user_id`.
- **Isolamento:** Usuários categoria `prestador` não podem alterar campos `is_official` ou `is_verified` (apenas Admin Master via RPC).

### 3. TESTE E2E (EVIDÊNCIA)
- **Cenário:** Login `jorgecriare2021@gmail.com`.
- **Validação:** Checar se `identity-service.ts` resolve `presentation.label` como "Prestador" e se `coin_balances` reflete 3600 moedas.

### 4. DASHBOARD DE STATUS
- **Local:** Novo componente `ProfileSyncStatus` dentro do Painel de Controle.
- **Dados:** Timestamp da última sincronização, versão do cache (v1.4) e logs de erro de rede Supabase.

