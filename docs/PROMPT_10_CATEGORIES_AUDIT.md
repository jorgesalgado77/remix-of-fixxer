# AUDITORIA DE CATEGORIAS E RAMOS (BASELINE v1.0.0)

## 1. Mapeamento Conceitual Canônico

### 1.1 Identidade (Quem o usuário É - Roles)
- **lojista**: Estabelecimento físico/digital que consome serviços e produtos.
- **prestador**: Profissional autônomo ou técnico que executa serviços.
- **fornecedor / parceiro**: Empresa B2B que fornece insumos, peças ou representação.
- **cliente**: Usuário final (consumidor).
- **admin**: Gestor da plataforma.

### 1.2 Atividade (O que o negócio FAZ)
- **Macro Categoria** (Ex: `moveis_reformas`): Agrupamento de alto nível (14 áreas).
- **Ramo** (Ex: `Móveis Planejados & Marcenaria`): O segmento principal de atuação.
- **Subcategoria** (Ex: `Cozinha Planejada`): Especialização dentro do ramo.
- **Ramo Customizado**: Armazenado em `custom_branch` com prefixo `Outro:`.

### 1.3 Competência (Como o profissional TRABALHA)
- **Serviço**: A tarefa executada (ex: `Montagem de Painel`).
- **Cargo / Job Role**: A função ocupada (ex: `Conferente`, `Montador`).
- **Especialidade**: Habilidades específicas (ex: `Microsoldagem`, `Vidro Temperado`).

---

## 2. Invariantes de Dados (Single Source of Truth)

### 2.1 Tabela `profiles` (Colunas Canônicas)
- `business_category`: ID ou Label da Macro Categoria.
- `activity_branch`: Ramo principal (exibido em badges).
- `custom_branch`: Texto livre para ramos não mapeados.
- `preferred_subcategories`: Array de strings com especializações.
- `job_roles`: Cargos ocupados (principalmente para prestadores).

### 2.2 Frontend (`src/lib/activity-branches.ts`)
- `ACTIVITY_MATRIX`: Matriz hierárquica imutável.
- `B2B_SUGGESTIONS`: Tabela de matching entre ramos para afiliados.

---

## 3. Matriz de Matching (Match Engine Baseline)

O motor de busca e recomendação deve considerar os pesos (configuráveis):
1. **Categoria/Ramo** (Peso 40%): Identidade de atuação.
2. **Distância** (Peso 25%): Cálculo Haversine via lat/lng.
3. **Disponibilidade** (Peso 15%): Status `is_online` e agenda.
4. **Reputação** (Peso 15%): Rating médio de `reviews`.
5. **Preço/Experiência** (Peso 5%): Metadados de O.S. anteriores.

---

## 4. Auditoria de Fluxos Atuais

- [ ] **Perfil**: Validar se o seletor de ramo persiste corretamente em `activity_branch` vs `custom_branch`.
- [ ] **Busca Universal**: Garantir que o `UniversalSearchPanel` indexa `job_roles` e `subcategories`.
- [ ] **Feed B2B**: O hook `useUserBranchContext` deve priorizar o match entre o ramo do lojista e o fornecedor compatível.
- [ ] **Criação de Anúncio**: A categoria da O.S. deve ser um subconjunto da `ACTIVITY_MATRIX`.

---

## 5. Próximos Passos (Remediação)
- Consolidar `store_profiles` e `provider_profiles` remanescentes na tabela única `profiles`.
- Sincronizar IDs de categorias entre `src/lib/activity-branches.ts` e a enumeração do banco de dados (se houver).
- Implementar `safe_category_match` no RPC de busca para lidar com radicais de palavras-chave.
