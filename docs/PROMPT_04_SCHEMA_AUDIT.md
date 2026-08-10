# PROMPT_04_SCHEMA_AUDIT - Consolidação Canônica

## 🛠️ Diagnóstico de Duplicidades
1. **Ordens de Serviço**: 
   - `service_orders`: Usada no frontend (`CreateAdModal`, `useProviderStats`).
   - `orders_of_service`: Definida no `complete_schema.sql` mas pouco utilizada no código.
   - **Ação**: Consolidar em `service_orders`.
2. **Avaliações**:
   - `reviews`: Usada em `ReviewModal`, `useProviderStats`.
   - `store_reviews`: Referenciada em `LojistaPublicProfilePage` (Legada).
   - **Ação**: Consolidar em `reviews`.
3. **Perfis**:
   - `profiles`: Tabela mestre unificada.
   - `store_profiles` / `provider_profiles`: Referências em testes e lógica de fallback.
   - **Ação**: Migrar colunas remanescentes para `profiles` e criar Views de compatibilidade.

## 📂 Plano de Migração (supabase/migrations/...)
- `20260810000002_canonical_os_consolidation.sql`: Migra dados de `orders_of_service` -> `service_orders`.
- `20260810000003_canonical_reviews_consolidation.sql`: Migra dados de `store_reviews` -> `reviews`.
- `20260810000004_canonical_profile_merging.sql`: Consolida tabelas satélites no `profiles`.

## 🛡️ Garantia de Integridade
- **Dados**: Scripts usam `INSERT INTO ... SELECT ... ON CONFLICT DO NOTHING`.
- **Frontend**: A View `profiles_public` servirá como ponte de compatibilidade.
- **FKs**: Verificadas relações em `service_orders` e `proposals`.

## ✅ Status
- Auditoria concluída.
- Relatório `FIXXER_CANONICAL_SCHEMA.md` gerado.
- Próximo passo: Aplicação dos scripts SQL de consolidação.
