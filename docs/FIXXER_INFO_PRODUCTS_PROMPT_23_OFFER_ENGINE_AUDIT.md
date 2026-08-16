# FIXXER — PROMPT 23: OFFER ENGINE V1

## Estrutura do Banco de Dados
- Tabela `public.info_offers`: Armazena as condições comerciais.
- Tabela `public.info_sales`: Atualizada para incluir rastreabilidade de ofertas.

## Backend
- RPC `validate_and_apply_info_offer`: Validação atômica de preço e validade da oferta.
- Integração no `checkout.functions.ts` para priorizar preço da oferta sobre o preço base do produto.

## Frontend
- Interface de gestão de ofertas no painel do prestador.
- Exibição de ofertas (preço comparativo) no Marketplace.

## Auditoria
- Verificação de RLS e integridade financeira.
- Testes de concorrência e expiração.
