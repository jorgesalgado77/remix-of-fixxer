# Auditoria FIXXER — INFO PRODUTOS — PROMPT 05

## Status: EM DESENVOLVIMENTO 🏗️

## Objetivos do Prompt
Implementar checkout real via ASAAS, sistema de Split (15% FIXXER / 85% Criador), Webhook com idempotência e Gestão de Entitlements baseada em Ledger.

## Checklist de Implementação

### 1. Configuração ASAAS & Taxas (Admin Master)
- [ ] Campos de configuração de API Key ASAAS e Webhook Secret no Painel Admin.
- [ ] Configuração de Taxa de Intermediação centralizada (default 15%).
- [ ] Interface para visualização de logs de split.

### 2. Checkout & Pagamento
- [ ] Fluxo de compra real: Botão Comprar -> Geração de Cobrança ASAAS (PIX).
- [ ] Modal de pagamento com QR Code e Copia e Cola real.
- [ ] Persistência de estado da transação (PENDING, PAID, etc).
- [ ] Ledger imutável para todas as movimentações.

### 3. Webhook & Idempotência
- [ ] Rota de webhook segura (`/api/public/asaas`).
- [ ] Validação de assinatura do webhook.
- [ ] Controle de idempotência para evitar duplicidade de créditos/entitlements.
- [ ] Liberação automática de conteúdo apenas após confirmação PAID.

### 4. Segurança & Entitlement
- [ ] RLS bloqueando acesso a arquivos privados sem entitlement válido.
- [ ] Validação de posse do produto no servidor antes de gerar Signed URLs.

## Verificação Técnica
- [ ] Build concluído com sucesso.
- [ ] Typecheck (TSC) limpo.
- [ ] Teste de idempotência (envio duplo de webhook).
- [ ] Teste de RLS (tentativa de acesso direto a conteúdo pago).

## Próximos Passos
1. Atualizar `MonetizationConfig` para incluir campos ASAAS.
2. Criar tabela de `financial_transactions` e `entitlements` no Supabase.
3. Implementar Server Functions para criação de cobrança.
4. Criar rota de Webhook.
