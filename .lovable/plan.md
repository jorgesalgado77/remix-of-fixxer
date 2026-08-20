# Plano de Auditoria e Otimização do Fluxo de Login

Auditar e corrigir o fluxo de autenticação para garantir carregamento imediato de dados reais e eliminar loops/lentidão.

## 1. Auditoria e Hardening da Rota de Login (`src/routes/auth.index.tsx`)
- Adicionar logs detalhados de cada etapa do `handleLogin`.
- Garantir invalidação total do `QueryClient` e `sessionStorage` antes do redirecionamento.
- Unificar a lógica de resolução de ID real no bypass para evitar discrepâncias.
- Adicionar tratamento de erro visual mais robusto.

## 2. Otimização do Gerenciamento de Identidade (`src/lib/current-user.ts`)
- Implementar `invalidateCurrentUser()` que limpa caches locais e do Supabase.
- Garantir que `getCurrentUser(true)` realmente ignore o cache em memória.
- Sincronizar o evento `fixxer:identity-change` com a limpeza do TanStack Query.

## 3. Refatoração do Hook de Perfil (`src/hooks/use-profile.ts`)
- Tornar o hook dependente do estado de autenticação real do `current-user.ts`.
- Reduzir o `staleTime` logo após o login para garantir que os dados venham do banco externo.

## 4. Auditoria de Dados Reais
- Criar script SQL para verificar e corrigir permissões de RLS nas tabelas `profiles` e `user_roles`.
- Garantir que o `Master Bypass` não mascare falhas de conexão com o banco externo.

## 5. Documentação
- Criar `docs/FIXXER_AUTH_FLOW_AUDIT.md` com o diagnóstico e as soluções aplicadas.
