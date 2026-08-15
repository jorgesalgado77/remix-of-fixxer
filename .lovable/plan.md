# Plano de Recuperação de Acesso: Administrador Master

Este plano visa diagnosticar e restaurar o acesso pleno do usuário `jorgericardosalgado@gmail.com` ao painel administrativo do FIXXER, garantindo a integridade do sistema e dos demais usuários.

## 1. Auditoria e Diagnóstico de Banco de Dados (Supabase Externo)

Identificar o estado atual do usuário no banco de dados para entender por que o acesso admin está sendo negado.

- **Verificação de Identidade**: Confirmar se o usuário existe em `auth.users`.
- **Verificação de Papéis (RBAC)**: Validar se há um registro na tabela `public.user_roles` com `role = 'admin'` para este UUID.
- **Verificação de Perfil**: Checar se a coluna `role` na tabela `public.profiles` está sincronizada com a role administrativa.
- **Verificação de Status**: Garantir que o usuário não está marcado como `bloqueado` na tabela de perfis.

## 2. Correção de Infraestrutura de Autenticação (Backend SQL)

Aplicar as correções necessárias via SQL no Supabase para garantir o acesso pleno.

- **Inserção de Role**: Garantir que a role `admin` existe no enum `app_role` e está atribuída ao usuário na tabela `user_roles`.
- **Sincronização de Perfil**: Atualizar o perfil do usuário para refletir a role administrativa.
- **Auditoria de Policies (RLS)**: Revisar e aplicar as permissões necessárias para que o papel `admin` possa ler/escrever em tabelas administrativas e de auditoria.

## 3. Endurecimento do Painel Administrativo (Frontend)

Garantir que a interface reconheça o usuário como administrador master e libere todas as ferramentas.

- **Validação de Guards**: Revisar `src/lib/admin-guard.ts` e `src/lib/current-user.ts` para assegurar que a detecção de `isAdmin` é robusta e baseada apenas no backend.
- **Acesso Pleno em Rotas**: Verificar se o `AuthenticatedLayout` em `src/routes/_authenticated.tsx` não possui bloqueios residuais baseados em critérios obsoletos.
- **Teste de Fluxo E2E**: Simular o login e a navegação por todas as páginas sob `/admin/*` para garantir que não existam redirecionamentos indesejados.

## 4. Segurança e Auditoria Final

- **Relatório de Acesso**: Gerar `docs/ADMIN_ACCESS_RECOVERY_AUDIT.md` detalhando as alterações realizadas.
- **Verificação Cross-Role**: Garantir que usuários com papéis `lojista`, `prestador`, etc., continuam isolados em seus respectivos painéis e não ganharam privilégios.

## Detalhes Técnicos

O script SQL a ser executado no Supabase será fornecido para garantir que o usuário:
1. Tenha o registro correto em `user_roles`.
2. O perfil em `profiles` esteja com `role = 'admin'` e `status = 'ativo'`.
3. As policies de RLS respeitem a função `has_role(auth.uid(), 'admin')`.
