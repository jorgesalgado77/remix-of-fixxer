---
name: PROMPT_03_SECURITY_AUDIT
description: Matriz de controle de acesso e auditoria de segurança RLS.
type: feature
---
# Matriz de Segurança FIXXER (v1.0.0)

| RECURSO | OWNER | PARTICIPANTE | ADMIN | PÚBLICO | NEGADO | COLUNA OWNER |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `profiles` | ALL | - | ALL | SELECT (Basic) | DELETE (Non-Admin) | `id` |
| `user_roles` | SELECT | - | ALL | NONE | INSERT/UPDATE/DELETE | `user_id` |
| `orders_of_service` | ALL | SELECT/UPDATE | ALL | NONE | DELETE | `lojista_id` / `current_professional_id` |
| `proposals` | ALL | - | ALL | NONE | UPDATE (Non-Owner) | `prestador_id` |
| `feed_posts` | ALL | - | ALL | SELECT (Active) | - | `user_id` |
| `notifications` | ALL | - | ALL | NONE | - | `user_id` |
| `user_coins` | SELECT | - | ALL | NONE | INSERT/UPDATE/DELETE | `user_id` |
| `coin_transactions` | SELECT | - | ALL | NONE | INSERT/UPDATE/DELETE | `user_id` |
| `documents` (JSON) | SELECT/UPDATE | - | ALL | NONE | - | `profiles.id` |
| `appointment_disputes`| ALL | SELECT | ALL | NONE | - | `created_by` / `participant_id` |

## Diagnóstico de Exposição em `profiles_public`
- **Sensível**: CPF, CNPJ, Rua, Número, CEP Completo, Telefone, Email Privado, Documentos, PIX.
- **Autorizado**: Nome, Avatar, Banner, Karma, Especialidade, Cidade, UF, Região, Raio de Atuação.

## Auditoria de RLS (Policies a Implementar/Corrigir)
1. **Profiles**: Bloquear `SELECT *` para anônimo. Criar View Restrita.
2. **Documents**: Mover de JSON no profile para bucket privado (Já iniciado em `profile-documents.ts`).
3. **Disputes**: Garantir que `USING` valide participação real.
4. **Financeiro**: Proibir qualquer `UPDATE` manual via cliente (usar RPCs).
