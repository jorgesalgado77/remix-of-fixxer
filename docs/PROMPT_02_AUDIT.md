# FIXXER IDENTITY & AUTHORIZATION AUDIT (v1.2.0)
Data: 10 de Agosto de 2026
Responsável: Arquiteto de Software Sênior

## 1. DIAGNÓSTICO DO BANCO REAL (IDENTIDADE CANÔNICA)
### O Enum Ativo (`public.app_role`)
Identificado em `src/integrations/supabase/complete_schema.sql` e `fix_signup_trigger.sql`:
- **Valores**: `admin`, `lojista`, `prestador`, `fornecedor`, `cliente`.
- **Observação**: Encontrei referências legadas a `casual`, `final`, `b2b`, `parceiro`. O sistema já possui lógica de normalização para o modelo canônico.

### Modelo de Identidade Detectado
O sistema segue o fluxo:
1. **auth.users**: Autenticação primária.
2. **profiles**: Dados do perfil (compartilhados), incluindo a coluna `role` (denormalizada para performance).
3. **user_roles**: RBAC real (Fonte de Verdade).
4. **has_role()**: Função SECURITY DEFINER usada em RLS e guards.

## 2. AUDITORIA DE SEGURANÇA (ESTADO ATUAL)
### Autorização e Guards
- **requireAdmin()**: Localizado em `src/lib/admin-guard.ts`. Implementado corretamente via `isCurrentUserAdmin()` que consulta o backend.
- **RLS**: As políticas em `complete_schema.sql` já utilizam `public.has_role(auth.uid(), 'admin')`.
- **Email Hardcoded**: Limpeza parcial realizada no Prompt 01. Ainda existem referências comentadas em SQL que devem ser mantidas como "REDACTED" apenas por histórico, mas inativas.

### Inconsistências Detectadas
1. **Rotas Autenticadas**: As rotas usam prefixos como `_authenticated.lojista.tsx`, mas o guard de nível superior em `_authenticated.tsx` precisa ser validado para garantir que um "cliente" não acesse o componente da rota "lojista" apenas mudando a URL.
2. **Duplicação de Tabelas**: `profiles_lojista` em `fixxer_profile_update.sql` conflita com a tabela mestre `profiles`.

## 3. MODELO CANÔNICO PROPOSTO
**USUÁRIO → ROLE PRINCIPAL (user_roles) → PERFIL (profiles)**

### Matriz de Papéis
| Role Canônica | Alias/Legado | Acesso Principal |
| :--- | :--- | :--- |
| **admin** | admin, master | /admin |
| **lojista** | lojista, store | /lojista |
| **prestador** | prestador, provider | /prestador |
| **fornecedor** | fornecedor, parceiro, b2b | /parceiro |
| **cliente** | cliente, casual, final | /cliente |

## 4. PRÓXIMOS PASSOS (MIGRATION)
- [ ] Eliminar tabela `profiles_lojista` e consolidar em `profiles`.
- [ ] Implementar middleware de rota no `_authenticated.tsx` que valida se a sub-rota (`lojista`, `prestador`, etc) condiz com a role real do usuário.
- [ ] Migrar todos os `UPDATE` de perfil para validar `auth.uid() = id`.

---
*Relatório gerado automaticamente para consolidar a baseline de autorização.*
