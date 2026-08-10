# AUDITORIA DE ESCROW, AGENDAMENTO E DISPUTAS (PROMPT 06)

## 1. Mapeamento de Entidades e Fluxos Financeiros

| Entidade | Tabela Original | Tabela Canônica | Status Auditoria |
| :--- | :--- | :--- | :--- |
| Agendamento | `appointments` | `appointments` | ✅ Consolidado |
| Eventos de Agendamento | - | `appointment_events` | 🆕 Criar (Imutável) |
| Custódia (Escrow) | `wallets` / `user_coins` | `escrow_transactions` | 🆕 Criar (Ledger) |
| Transações | `coin_transactions` | `coin_transactions` | ✅ Auditável |
| Disputas | `appointment_disputes` | `appointment_disputes` | ✅ RLS Privado |

## 2. Matriz de Estados e Bloqueios (Escrow)

| Estado Appointment | Ação Financeira Permitida | Bloqueios Ativos |
| :--- | :--- | :--- |
| `pending` | Criar Escrow (Sinal) | Liberação, Reembolso |
| `confirmed` | Manter Escrow | Liberação, Reembolso |
| `checked_in` | Bloquear Alteração Valor | Reembolso Direto |
| `completed` | Liberação Automática/Manual | Reembolso (exceto Disputa) |
| `cancelled` | Reembolso Automático | Liberação |
| `disputed` | **CONGELADO** | Todas as operações auto |

## 3. Segurança e Idempotência (Regras de Ouro)

1.  **Idempotency Key**: Toda RPC financeira exige `_idempotency_key`. O banco deve possuir constraint `UNIQUE` na tabela de transações para esta chave.
2.  **Server-Side Authority**: O frontend envia a *intenção* (ex: "quero fazer check-out"). O backend verifica geolocalização, fotos, status atual e então executa a liberação de moedas.
3.  **Audit Trail**: Cada transição de escrow deve gerar um registro em `appointment_events` e um log financeiro.
4.  **Evidence Protection**: Fotos de check-in/out e evidências de disputa ficam em buckets privados. O acesso é restrito via Signed URLs para o `proposer_id`, `invitee_id` e usuários com role `admin`.

## 4. Cenários de Concorrência e Resiliência

- **Double Click (Liberação)**: Bloqueado por `UNIQUE (appointment_id, type) WHERE type = 'release'`.
- **Refresh durante Escrow**: O frontend deve checar o status `pending_escrow` antes de re-tentar.
- **Disputa vs Conclusão**: Se uma disputa for aberta enquanto o check-out está sendo processado, a transação deve ser abortada via `SELECT FOR UPDATE` na linha do agendamento.

## 5. Próximos Passos (SQL)

- Criar `escrow_transactions` com suporte a idempotência.
- Implementar `transition_appointment_status` RPC.
- Criar trigger de bloqueio financeiro para status `disputed`.
- Migrar `release_escrow_for_appointment` para o novo modelo de ledger.
