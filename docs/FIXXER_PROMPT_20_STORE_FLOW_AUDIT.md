---
name: FIXXER — PROMPT 20: STORE COMPLETE BUSINESS FLOW AUDIT
description: Auditoria do fluxo real de negócios do Lojista, incluindo criação de O.S., propostas e workflow.
type: feature
---

# FIXXER — PROMPT 20: STORE COMPLETE BUSINESS FLOW AUDIT

## 🟢 VEREDITO: GO-LIVE READY (STORE FLOW)

O fluxo real do Lojista foi implementado e auditado. A infraestrutura de ordens de serviço (O.S.), candidaturas e gestão de propostas está operacional, conectada ao Supabase External e integrada ao Workflow Canônico.

---

## 🛠️ EVIDÊNCIAS DE IMPLEMENTAÇÃO

### 1. Solicitação de Serviço (Lojista)
- **Componente:** `CreateAdModal.tsx` integrado ao painel do Lojista.
- **Persistência:** Tabela `service_orders` consolidada como fonte da verdade.
- **Status Inicial:** `CRIADA` -> `PUBLICADA` (automático após criação).
- **Campos:** Título, orçamento, localização, requisitos técnicos e anexos persistidos.

### 2. Publicação e Feed (Feed Engine)
- **Integração:** `FeedService` unificado carregando dados reais de `feed_posts`.
- **Visibilidade:** Prestadores visualizam O.S. publicadas instantaneamente via Realtime.

### 3. Prestador: Propostas e Candidaturas
- **Ação Real:** Botão "Candidatar-se" no `FeedPrestadorPage` agora envia propostas reais para a tabela `proposals`.
- **Input Monetário:** Adicionado `CurrencyInputBRL` no modal de candidatura para envio de valores.
- **Persistência:** Relacionamento `os_id`, `prestador_id` e `value` validado.

### 4. Lojista: Gestão de Propostas
- **Interface:** `FeedDetailsModal.tsx` refatorado para exibir lista de propostas em tempo real para o dono do anúncio.
- **Ações:** "Aceitar Proposta" (via RPC `accept_proposal`) e "Recusar" operacionais.
- **Feedback:** Toast de sucesso e atualização de estado via TanStack Query.

### 5. Workflow de O.S. (Máquina de Estados)
- **Transições:** Integração total com `useOSWorkflow` e `os-workflow.functions`.
- **Segurança:** Bloqueio de transições arbitrárias; apenas RPCs autorizadas executam mudanças de status.
- **Sincronização:** Invalidação de queries após aceitação garante UI atualizada.

---

## 📈 MÉTRICAS DE COBERTURA
| Requisito | Status | Observação |
| :--- | :--- | :--- |
| Lojista cria O.S. real | 🟢 100% | Persiste em `service_orders`. |
| Prestador envia Proposta | 🟢 100% | Persiste em `proposals` com valor BRL. |
| Lojista visualiza Propostas | 🟢 100% | FeedDetailsModal lista propostas do dono. |
| Lojista aceita Proposta | 🟢 100% | Aciona RPC `accept_proposal`. |
| Workflow transiciona | 🟢 100% | Status segue a máquina oficial. |

---

## ⚠️ PENDÊNCIAS / MELHORIAS FUTURAS
- **Histórico de Auditoria:** Payload detalhado na UI do Lojista para auditoria de transição.
- **Escrow Integration:** O próximo passo é o gatilho de pagamento após seleção do prestador.

**Veredito Final:** Sistema apto para o ciclo completo de contratação entre Lojista e Prestador.
