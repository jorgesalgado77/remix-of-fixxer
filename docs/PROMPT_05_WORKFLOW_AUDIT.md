---
name: PROMPT_05_WORKFLOW_AUDIT
description: Auditoria do fluxo operacional consolidado e máquina de estados da O.S.
type: feature
---

# PROMPT_05_WORKFLOW_AUDIT

## 🏗️ Objetivo
Consolidar o núcleo operacional do FIXXER em uma única máquina de estados, eliminando modelos redundantes e garantindo integridade transacional.

## 🔄 Máquina de Estados da O.S. (`service_orders`)
1.  **CRIADA**: Rascunho inicial.
2.  **PUBLICADA**: Visível para prestadores.
3.  **RECEBENDO_PROPOSTAS**: Período de lances.
4.  **PRESTADOR_SELECIONADO**: Profissional escolhido pelo lojista.
5.  **PAGAMENTO_EM_CUSTODIA**: Moedas bloqueadas no Escrow.
6.  **AGENDADA**: Data de início definida.
7.  **CHECKIN**: Prestador chegou ao local.
8.  **EM_EXECUCAO**: Trabalho em andamento.
9.  **CHECKOUT**: Prestador finalizou e solicitou liberação.
10. **AGUARDANDO_CONFIRMACAO**: Lojista revisando o serviço.
11. **CONCLUIDA**: Serviço aprovado.
12. **ESCROW_LIBERADO**: Moedas transferidas ao prestador.
13. **AVALIACAO_PENDENTE**: Aguardando review mútua.
14. **FINALIZADA**: Ciclo completo.

### Estados Alternativos
- **CANCELADA**: Interrupção do fluxo.
- **EXPIRADA**: Sem propostas no prazo.
- **EM_DISPUTA**: Conflito entre as partes.
- **REEMBOLSADA**: Moedas devolvidas ao lojista.

## 🛡️ Regras de Integridade (Backend Enforced)
- **Bloqueio de Pulo**: Não é permitido ir de `PUBLICADA` para `EM_EXECUCAO` sem passar por `ACEITE` e `CUSTÓDIA`.
- **Idempotência**: Transações de moedas devem ter `transaction_id` único vinculado à O.S. e estado.
- **Unicidade de Aceite**: Apenas uma proposta pode estar `aceita` por O.S.
- **Segurança Escrow**: Apenas o sistema ou o `owner_id` (em estados específicos) pode liberar fundos.

## 📂 Consolidação Realizada
- **Tabelas**: `service_orders` é a única fonte de verdade. `orders_of_service` removida.
- **Propostas**: `proposals` vinculadas exclusivamente a `service_orders`.
- **Triggers**: Atualizados para lidar com os novos enums de status case-sensitive.

## 🚀 Checklist de Auditoria
- [ ] Criar OS -> Publicar.
- [ ] Enviar 2 propostas -> Aceitar 1.
- [ ] Simular falha de pagamento (moedas insuficientes).
- [ ] Validar Check-in via Geolocalização.
- [ ] Simular abertura de Disputa durante `EM_EXECUCAO`.
- [ ] Avaliação mútua e fechamento de ciclo.
