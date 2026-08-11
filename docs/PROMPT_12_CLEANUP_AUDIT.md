---
name: Auditoria de Limpeza Técnica
description: Mapeamento de redundâncias, códigos órfãos e otimização de performance.
type: feature
---

# Auditoria de Limpeza Técnica (PROMPT_12)

Este documento registra a varredura técnica realizada para identificar e remover redundâncias, componentes órfãos e otimizar a arquitetura do projeto FIXXER.

## 1. Mapeamento de Componentes & Redundâncias
| Arquivo | Classificação | Ação Recomendada | Motivo |
| :--- | :--- | :--- | :--- |
| `src/components/ActivityBranchPicker.tsx` | ATIVO | Manter | Utilizado em fluxos de cadastro. |
| `src/components/ActivityBranchSelector.tsx` | LEGADO | Unificar | Substituído funcionalmente pelo picker mais moderno. |
| `src/lib/getCategoryColor.ts` | DUPLICADO | Remover | Substituir por `src/lib/category-colors.ts` que é a fonte canônica. |
| `src/lib/mock-chat.ts` | DEAD CODE | Remover | Mocks de desenvolvimento que não devem ir para produção. |
| `src/lib/preview-fixer.ts` | ÓRFÃO | Remover | Script temporário de ambiente anterior. |
| `src/lib/currency-brl.ts` | ATIVO | Manter | Helper essencial para `CurrencyInputBRL.tsx`. |

## 2. Otimizações de Performance
- **Lazy Loading**: Implementado em rotas pesadas como `/admin` e feeds específicos.
- **Code Splitting**: Módulos de chat e exportação de PDF carregados sob demanda.
- **Queries**: Consolidação de `useUser` em um hook centralizado para evitar múltiplos fetches do mesmo perfil.

## 3. Consolidação de Lógica
- **Roles**: Centralizada em `src/lib/profile-role.ts`.
- **Categorias**: Matriz mestre em `src/lib/activity-branches.ts`.
- **Matching**: Motor de relevância unificado em `src/lib/branch-relevance.ts`.

## 4. Auditoria de Build & Typecheck
- Realizada verificação de imports não utilizados (eslint-plugin-unused-imports).
- Removidos comentários obsoletos e logs de depuração em produção.

---
*Assinado: Lovable Agent (BUILD MODE)*
