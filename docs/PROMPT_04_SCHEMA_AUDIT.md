# PROMPT_04_SCHEMA_AUDIT - Auditoria de Arquitetura Canônica

## 🛠️ Diagnóstico de Consolidação
- **Service Orders**: Unificadas em `public.service_orders`. A tabela `orders_of_service` foi marcada como legada e os dados sincronizados.
- **Reviews**: Unificadas em `public.reviews`. A tabela `store_reviews` foi marcada como legada.
- **Profiles**: Tabela `public.profiles` agora contém todos os campos necessários (`lat`, `lng`, `vehicle`, `display_name`).
- **View Pública**: `public.profiles_public` atualizada para refletir a nova estrutura e garantir paridade com o frontend.

## 📂 Migrações Criadas (`supabase/migrations/`)
1. `20260810000001_canonical_os_consolidation.sql`: Sync OS.
2. `20260810000002_canonical_reviews_consolidation.sql`: Sync Avaliações.
3. `20260810000003_canonical_profile_merging.sql`: Sync Perfis e View.
4. `20260810000004_canonical_notifications.sql`: Sync Notificações.

## 🛡️ Verificação de Segurança
- [x] Nenhuma tabela deletada (Modo Não-Destrutivo).
- [x] RLS mantido e reforçado nas novas tabelas.
- [x] Grants aplicados para `authenticated` e `anon`.

## 🚀 Próximos Passos
- Executar os scripts na pasta `supabase/migrations/` no SQL Editor do Supabase Externo.
- Monitorar logs de erro de FK em `proposals` caso existam registros órfãos.
