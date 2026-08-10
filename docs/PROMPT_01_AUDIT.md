# PROMPT_01_AUDIT - Security Hardening (v1.1.0)

## 🛠️ Alterações Executadas

1.  **Remoção de Bypass por E-mail**: O gatilho `handle_new_user` no SQL e a lógica no frontend (`UniversalSearchPanel`) foram alterados para remover referências a e-mails hardcoded como critério de privilégio ou busca.
2.  **Sanitização de Migrations**: O arquivo `complete_schema.sql` foi limpo, removendo o hash da senha Master e o bypass de e-mail.
3.  **RBAC Mandatório**: A autorização administrativa agora depende exclusivamente da tabela `user_roles` e da função `has_role()`.
4.  **Limpeza de Frontend**: Removida a busca por e-mail específico do Admin no `UniversalSearchPanel`.
5.  **Criação de Migration de Hardening**: Nova migration `supabase/migrations/20260810000000_security_hardening.sql` para aplicar as correções no banco real.

## 📂 Arquivos Alterados

- `src/integrations/supabase/complete_schema.sql`
- `src/components/UniversalSearchPanel.tsx`
- `supabase/migrations/20260810000000_security_hardening.sql` (Novo)
- `docs/SECURITY_CREDENTIAL_ROTATION.md` (Novo)
- `docs/PROMPT_01_AUDIT.md` (Novo)

## 🛡️ Riscos Corrigidos

- [ALTO] Senha Master hardcoded em arquivos SQL.
- [MÉDIO] Autorização baseada em e-mail fixo no trigger de banco de dados.
- [MÉDIO] Vazamento de e-mail administrativo no código do componente de busca.

## ⚠️ Riscos Restantes

- **Histórico do Git**: As senhas removidas ainda podem estar presentes em commits anteriores. Recomenda-se a rotação conforme `SECURITY_CREDENTIAL_ROTATION.md`.
- **Service Role Key**: Não foi encontrada a `service_role` key no frontend, mas a auditoria recomenda a rotação se houver suspeita de vazamento em logs.

## ✅ Testes Executados

- Inspeção estática de código (ripgrep) confirmando a remoção das strings sensíveis.
- Verificação da lógica de `admin-guard.ts` (já estava correta, baseada em `user_roles`).
- Validação da idempotência da nova migration.

## ❌ Falhas Encontradas e Corrigidas

- Identificado que o trigger `handle_new_user` promovia automaticamente o e-mail específico a admin. Corrigido para depender de metadados ou configuração externa segura.
