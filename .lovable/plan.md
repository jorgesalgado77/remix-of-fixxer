# Plano de Implementação — FIXXER INFO PRODUTOS — PROMPT 01

Este plano detalha a criação da base de dados canônica para o módulo de INFO PRODUTOS no Supabase externo, seguindo rigorosamente as Regras Mestras FIXXER.

## Alterações de Usuário

### Banco de Dados (Supabase Externo)
Criação de tabelas com prefixo `info_` para evitar conflitos e garantir isolamento, mantendo integridade com a tabela `profiles` existente.

1.  **info_products**: Tabela mestre para produtos digitais (Ebooks, Cursos, Mentorias).
2.  **info_product_modules**: Estrutura de módulos para cursos.
3.  **info_product_lessons**: Aulas vinculadas aos módulos.
4.  **info_product_files**: Gestão de ativos (PDFs, vídeos, links) com suporte a Storage privado.
5.  **info_product_previews**: Conteúdo gratuito para degustação.
6.  **info_product_offers**: Gestão de preços, moedas e validades.
7.  **info_product_reviews**: Avaliações vinculadas a compras reais.

### Segurança e Auditoria
*   **RLS (Row Level Security)**: Políticas rigorosas para que apenas criadores editem seus produtos e apenas compradores acessem conteúdos pagos (via entitlements futuros).
*   **Indices e FKs**: Otimização para performance em dispositivos de entrada (Realme C55).
*   **Relatório de Auditoria**: Documentação técnica detalhada em `docs/FIXXER_INFO_PRODUCTS_PROMPT_01_AUDIT.md`.

## Detalhes Técnicos

### Estrutura de Tabelas (SQL)
```sql
-- Exemplo de relacionamento canônico
ALTER TABLE public.info_products 
ADD CONSTRAINT info_products_creator_id_fkey 
FOREIGN KEY (creator_id) REFERENCES public.profiles(id);
```

### Componentes e Hooks
*   Reuso do `IdentityService` para identificação de criadores.
*   Reuso do `use-media-upload` para upload de capas e arquivos.
*   Uso do prefixo `info_` em todos os novos objetos de banco.

### Verificações Pós-Execução
1.  Build e Typecheck.
2.  Validação de RLS via SQL.
3.  Verificação de redundâncias ou mocks.
