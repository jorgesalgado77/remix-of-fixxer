# Plano de Endurecimento do Modal PIX (Prompt 15.7)

Implementar dados reais, filtros de período e gestão de chave PIX no modal de recebimentos para garantir consistência financeira.

## Mudanças sugeridas

### Frontend
- **`PixManagerModal.tsx`**:
    - Substituir os saldos calculados por mock (`balance * 0.3`, etc.) por valores agregados reais.
    - Adicionar um seletor de período (7, 15, 30 dias, Personalizado) no topo do modal.
    - Implementar um estado visual de "Chave PIX não configurada" com um botão de ação para `/configuracoes`.
    - Adicionar DatePicker para filtro personalizado (se necessário) ou simplificar com presets.
- **`useProviderStats.ts`**:
    - Refatorar o hook para aceitar um parâmetro de `dateRange`.
    - Realizar queries filtradas por `created_at` no Supabase para retornar saldos do período.
    - Implementar lógica de agregação de `service_orders` (Reservas/Serviços) e `coin_transactions` (Info Produtos).

### Dados e Segurança
- Garantir que as queries respeitem RLS (`owner_id = auth.uid()`).
- Validar se a `pix_key` está vindo corretamente do `user_metadata` ou do perfil mestre.

## Detalhes Técnicos
- Utilizar `subDays(new Date(), period)` para cálculos de data.
- Adicionar `onPeriodChange` no modal para disparar refetch no hook de estatísticas.
- Manter o layout responsivo e sem cortes em mobile.

## Testes de Verificação
- Abrir o modal com um usuário sem chave PIX -> Deve mostrar botão "Configurar".
- Trocar filtro para "7 dias" -> Saldos devem atualizar para refletir apenas esse período.
- Verificar se os valores de "Serviços" batem com a soma de O.S. concluídas no período.
