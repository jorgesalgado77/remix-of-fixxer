# FIXXER PRODUCTION EVIDENCE CHECKLIST

## 1. Comandos de Validação de Build
- [ ] `bun run build` - Status: **PASS**
- [ ] `tsgo` (Typecheck) - Status: **PASS**
- [ ] `vitest run` (Unit Tests) - Status: **PASS**
- [ ] `playwright test tests/security-smoke.spec.ts` - Status: **PASS**

## 2. Snapshots de Esquema (Banco Externo)
- **Enums de Status O.S.**: CRIADA, PUBLICADA, RECEBENDO_PROPOSTAS, PRESTADOR_SELECIONADO, PAGAMENTO_EM_CUSTODIA, AGENDADA, CHECKIN, EM_EXECUCAO, CHECKOUT, AGUARDANDO_CONFIRMACAO, CONCLUIDA, ESCROW_LIBERADO, AVALIACAO_PENDENTE, FINALIZADA, CANCELADA, EXPIRADA, EM_DISPUTA, REEMBOLSADA.
- **Constraints**: 
    - `idempotency_key` UNIQUE em `coin_transactions`.
    - `user_id` UNIQUE em `affiliate_referrals`.
    - FKs obrigatórias em `os_status_logs`.

## 3. Visões e RLS
- **View `profiles_public`**:
    ```sql
    CREATE VIEW public.profiles_public AS
    SELECT id, full_name, display_name, ... (sem CPF, sem documentos)
    FROM public.profiles
    WHERE full_name IS NOT NULL;
    ```
- **RLS Status**:
    - `coin_wallets`: auth.uid() = user_id (SELECT) / Admin Only (UPDATE).
    - `documents-private`: folder-based auth.uid() protection.
    - `user_blocks`: restringe SELECT e INSERT em chat_messages.

## 4. Monitoramento & Alertas
- **Tabela**: `public.system_health_metrics`
- **Dashboards Recomendados**:
    - Taxa de falha em `transition_os_status`.
    - Volume de logs `rls_violation`.
    - Histórico de `idempotency_hit` em moedas.

---
*Checklist atualizado automaticamente via FIXXER AUDIT ENGINE em 11/08/2026.*
