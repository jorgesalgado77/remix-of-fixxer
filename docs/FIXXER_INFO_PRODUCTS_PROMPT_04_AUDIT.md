# Auditoria FIXXER — INFO PRODUTOS — PROMPT 04

## Status: EM DESENVOLVIMENTO 🏗️

## Objetivos do Prompt
Implementar o Marketplace Público de Info Produtos e a Página de Detalhes do Produto, garantindo segurança, performance e fidelidade ao modelo de dados do Supabase Externo.

## Checklist de Implementação

### 1. Marketplace Público
- [ ] Rota pública `/marketplace` criada.
- [ ] Seção de Destaques (Hero).
- [ ] Filtros por categoria (Ebook, Vídeo, Curso).
- [ ] Filtros por preço e avaliação.
- [ ] Listagem paginada (Supabase).
- [ ] Cards de produto com Identidade Canônica do Creator.

### 2. Página do Produto (Public/PDP)
- [ ] Rota `/info/$id` criada.
- [ ] Exibição de Capa/Banner.
- [ ] Identidade Canônica do Creator integrada.
- [ ] Seção de Módulos/Aulas (Bloqueada se pago).
- [ ] Sistema de Preview (Vídeo curto / PDF limitado).
- [ ] Botão de Compra funcional (Entrada para checkout).

### 3. Segurança e Performance
- [ ] Bloqueio de conteúdo pago no frontend (Anti-Bypass).
- [ ] Lazy Load de imagens e vídeos.
- [ ] Queries otimizadas (sem N+1).
- [ ] Resiliência em dispositivos de baixo hardware (Realme C55 target).

## Verificação Técnica
- [ ] Build concluído com sucesso.
- [ ] Typecheck (TSC) limpo.
- [ ] Testes de RLS (Somente produtos publicados visíveis publicamente).
- [ ] Sem dados hardcoded/mock nas listagens.

## Próximos Passos
1. Criar rotas de marketplace e detalhes.
2. Implementar queries do Supabase para `info_products`.
3. Criar componentes de UI para o Marketplace.
4. Validar segurança do conteúdo.
