# FIXXER — PROMPT 16: DATABASE CANONICAL AUDIT

Relatório de estabilização do contrato de banco de dados e consolidação de schema.

## 🟢 ENTIDADES CANÔNICAS (Verificadas e Consolidadas)

- **profiles**: Fonte única de verdade para identidade. Campos de localização, atividade e badges centralizados.
- **user_roles**: Única fonte de autorização (RBAC).
- **service_orders**: Tabela consolidada para O.S. (Lojista/Prestador/Cliente). Inclui prioridade, prazos e anexos.
- **messages**: Tabela unificada para chat e mensagens de O.S. (Substitui `chat_messages` e `os_messages`).
- **proposals**: Vinculada corretamente a `service_orders`.
- **service_applications**: Fluxo canônico de candidatura de prestadores a serviços.
- **b2b_quotes**: Fluxo canônico de cotações Lojista ↔ Fornecedor.
- **store_profiles, provider_profiles, supplier_profiles**: Extensões de identidade para dados específicos de categoria.
- **notifications**: Estrutura unificada com `user_id` e `is_read`.
- **user_coins / coin_transactions**: Ledger financeiro integrado.
- **os_status_logs**: Auditoria de workflow da máquina de estados.

## 🟡 COMPATIBILIDADE (Legacy / Marcas de Transição)

- **orders_of_service**: Marcada como LEGADA em favor de `service_orders`.
- **chat_messages**: Marcada como LEGADA em favor de `messages`.
- **os_messages**: Marcada como LEGADA em favor de `messages`.
- **store_reviews**: Marcada como LEGADA em favor de `reviews`.

## 🔴 CONFLITOS (Resolvidos)

- **Identidade Fragmentada**: Resolvido através do `IdentityService` canônico e extensões de tabela.
- **Divergência de Notificações**: Unificado para `notifications.user_id`.
- **Divergência de Chat**: Unificado para `messages` com suporte a metadados.

## EVIDÊNCIA TÉCNICA

O arquivo `src/integrations/supabase/complete_schema.sql` foi atualizado para refletir o contrato canônico 100% aderente ao banco de dados externo.

**Veredito Final: 🟢 CANONICAL CONTRACT ESTABLISHED**
