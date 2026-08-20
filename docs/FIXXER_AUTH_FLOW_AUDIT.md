# Diagnóstico e Soluções: Fluxo de Autenticação FIXXER

## 1. Problemas Identificados (Causa Raiz)
- **Persistência de Cache do Roteador:** O TanStack Router mantém estados de rotas anteriores em `sessionStorage`, o que causava loops quando o usuário logava e o sistema ainda "lembrava" da página de login.
- **Race Condition no Bypass:** A resolução do ID do usuário no modo Master Bypass era assíncrona e ocorria após o início do redirecionamento, resultando em dados de "Usuário Teste" até o próximo F5.
- **Inconsistência de Redirecionamento:** O uso de `router.navigate` em alguns pontos era interceptado por guards que ainda não tinham o estado de autenticação atualizado.

## 2. Soluções Implementadas
- **Ejeção Brutal (Brutal Ejection):** Implementado `window.location.replace` com limpeza completa de `sessionStorage` e `localStorage` antes e depois do login. Isso força o navegador a recarregar o estado da aplicação do zero, garantindo dados reais do banco.
- **Watchdog de Redirecionamento:** Adicionado um intervalo de verificação (100ms) na rota `/auth` que detecta se uma sessão foi iniciada em outra aba ou por bypass e ejeta o usuário imediatamente.
- **Resolução de ID Real no Login:** O `handleLogin` agora busca e persiste o ID real do perfil do banco externo *antes* de completar o redirecionamento, garantindo que o `ProfileSummaryCard` hidrate com dados corretos instantaneamente.
- **Otimização de Cache (TanStack Query):** Reduzido o `staleTime` do perfil para 30 segundos, forçando a revalidação com o banco externo com maior frequência.

## 3. Verificação
- O login agora é atômico: limpa -> autentica -> resolve ID -> redireciona -> recarrega.
- A segurança admin foi reforçada no nível de código (`current-user.ts`), permitindo acesso master apenas ao e-mail autorizado.
