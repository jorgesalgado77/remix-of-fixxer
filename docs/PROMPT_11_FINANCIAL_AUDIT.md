---
name: Auditoria Financeira e de Afiliados
description: Consolidação das operações de valor em um modelo transacional seguro, imutável e auditável.
type: feature
---

# Auditoria Financeira e de Afiliados (PROMPT_11)

Este documento estabelece as regras canônicas para movimentações financeiras, gestão de moedas (coins), sistemas de afiliados e custódia (escrow) no ecossistema FIXXER.

## 1. Princípios Transacionais
- **Autoridade Única**: O frontend NUNCA altera saldos diretamente. Todas as operações devem passar por RPCs ou Server Functions que validam regras de negócio no servidor/banco.
- **Ledger Imutável**: Toda alteração de saldo gera obrigatoriamente um registro no extrato (`coin_transactions`, `wallet_transactions`). Registros financeiros nunca são deletados ou editados.
- **Idempotência**: Todas as operações críticas devem exigir uma `idempotency_key`. Repetições da mesma chave não devem gerar novos débitos/créditos.
- **Saldo Derivado**: O saldo exibido deve ser o resultado da soma do ledger ou atualizado via triggers atômicos, garantindo que `balance = sum(credits) - sum(debits)`.

## 2. Sistema de Moedas (Coins)
Para cada transação de moedas, os seguintes campos são obrigatórios:
- `user_id`: Dono da carteira.
- `type`: 'credit' ou 'debit'.
- `amount`: Valor absoluto da transação.
- `source`: Origem (ex: 'purchase_pack', 'bonus', 'action_consume').
- `reason`: Motivo detalhado legível.
- `idempotency_key`: UUID único da operação.
- `balance_after`: Instantâneo do saldo após a operação para auditoria rápida.

**Restrições**:
- Saldo negativo é proibido por padrão (CHECK constraints no banco).
- Débitos duplicados por "double click" devem ser filtrados pela chave de idempotência.

## 3. Matriz de Afiliados
- **Identificação**: Código único por perfil (`affiliate_profiles.code`).
- **Indicação**: Registro único de referral.
- **Anti-Fraude**:
    - Bloqueio de auto-referência (`referred_user_id != affiliate_user_id`).
    - Comissão única por evento de conversão.
    - Trilha de origem (`source`, `utm_campaign`) preservada.

## 4. Governança Administrativa
- Administradores podem configurar preços e pacotes.
- **Auditoria Admin**: Ajustes manuais de saldo por administradores geram logs específicos na tabela `audit_logs` e no extrato do usuário com o tipo `admin_adjust`.
- Proibida alteração silenciosa de histórico financeiro por qualquer nível de acesso.

## 5. Casos de Teste e Validação
- **Concorrência**: Testar duas abas tentando realizar o mesmo pagamento simultaneamente.
- **Resiliência**: Falha de rede durante o processamento do webhook de pagamento.
- **Integridade**: Verificação periódica de divergência entre `profiles.balance` e a soma de `transactions`.

---
*Assinado: Lovable Agent (BUILD MODE)*
