# AUDITORIA FIXXER — Estado da Plataforma

_Gerado automaticamente pelo agente. Última varredura: rotas, componentes, hooks, libs e páginas em `src/`._

---

## 🟢 CONCLUÍDO E OPERACIONAL

### Rotas e navegação
- `src/routes/index.tsx` (home institucional) + `terms.tsx`.
- `src/routes/auth.index.tsx` / `auth.tsx` (login sem bypass hardcoded; validação real via `user_roles`).
- `src/routes/cadastro.tsx` com Casual/Lojista/Prestador/Fornecedor e máscaras CPF/CNPJ/Telefone.
- `_authenticated.tsx` com verificação de admin server-side (`user_roles`), sem depender de `localStorage`.
- Dashboards: `_authenticated.lojista.tsx`, `_authenticated.prestador.tsx`, `_authenticated.parceiro.tsx`, `_authenticated.cliente.tsx`, `_authenticated.admin.tsx`, `dashboard.lojista.tsx`, `dashboard.prestador.tsx`.
- Feeds dedicados: `_authenticated.feed.{lojista,prestador,parceiro,cliente}.tsx` + redirect por categoria em `_authenticated.feed.index.tsx`.
- Chat: `_authenticated.chat.tsx` + `_authenticated.chat.$peerId.tsx`.
- Perfil: `_authenticated.profile.tsx` com endereço completo, raio de atuação (10/25/50/100 km) persistindo em `profiles.service_radius_km` + `localStorage`.
- Perfis públicos: `lojista.$id.tsx`, `prestador.$id.tsx`, `parceiro.$id.tsx`, `cliente.$id.tsx`.

### Cores contextuais
- `src/lib/category-colors.ts` (paleta oficial única) + `src/lib/user-category.ts` com `useContextualCategory(pathname)` aplicado no `__root.tsx` via `getCategoryCssVars` — visitar perfil de outra categoria já muda `--primary`, `--ring`, `--sidebar-primary` para a cor do dono.
- Chat contextual: rota `chat.$peerId` herda a categoria da rota via `useContextualCategory`.

### Raio de atuação
- `src/components/RadiusFilter.tsx` dispara `fixxer:radius-change` e persiste em `localStorage`.
- Presente em todos os 4 feeds (Lojista, Prestador, Parceiro, Cliente).
- Default lido de `profiles.service_radius_km` no boot do perfil.

### Modal Criar Serviço (`CreateAdModal.tsx`)
- Container `h-[100dvh]` mobile com `padding-top: env(safe-area-inset-top)`.
- Header `shrink-0` (persistente com teclado aberto) + botão Prévia/Editar mobile.
- Tipos de serviço com ícones coloridos (Ciano/Violeta/Verde/Âmbar/Vermelho/Dourado) — **inclui 🚚 Frete e 📝 Outro**.
- Frete abre inputs **Volumes** e **Peso médio (kg)**.
- Outro abre input de texto descritivo (validado).
- Preço: **Fixo**, **% Comissão** e **💵 Fixo + Comissão combinados** com cálculo em tempo real (`commissionValue` memoizado).
- Persistência real em `service_orders` via `supabaseExternal` + rascunho local (`fixxer:create-ad-draft:v1`) com auto-save debounced.
- Validação inline com bordas destacadas por campo monetário (`fieldErrors`).
- Moeda BRL padronizada via `src/components/CurrencyInputBRL.tsx` + `src/lib/currency-brl.ts`.

### Uploads / Mídia
- Bucket `media` via `src/hooks/use-media-upload.ts` + `upload-with-progress.ts`.
- `PhotoSectionsManager.tsx` estilo Pinterest (Show Room, Montagens, etc.).
- `AttachmentPreview.tsx` com preview de PDF, imagem e vídeo, `loading="lazy"` e `decoding="async"`.
- Compressão AVIF/WebP em `src/utils/image-compression.ts`.

### Escrow / Reputação
- `EscrowBadge.tsx`, `GoldMedalBadge.tsx`, `ReviewModal.tsx` conectados ao fluxo de propostas.

### Segurança
- Bypass hardcoded de admin removido.
- Verificação de role via `has_role()` (SECURITY DEFINER) + trigger `trg_prevent_role_change`.
- View `profiles_public` restringe PII (CPF/CNPJ/e-mail) para leitores anônimos.

### Performance / Mobile
- `src/hooks/use-performance-mode.ts` detecta device low-end e alterna glassmorphism.
- `src/styles.css` expõe `scrollbar-none`, `scrollbar-thin` (tematizada) e scrollbar global fina.
- `src/lib/preview-fixer.ts` recupera sessão silenciosamente.

---

## 🟡 PARCIAL — Ajustes recomendados

1. **Chat multicategoria com mock realista + cor por origem**: infra pronta (`useContextualCategory`), mas as bolhas de mensagem ainda usam apenas `--primary` do peer — falta destacar mensagens do próprio usuário na cor da _sua_ categoria (dual-tone). Baixo esforço.
2. **Realtime Serviço → Feed**: `service_orders` grava, feeds carregam via query. Falta um `dispatchEvent('fixxer:service-created')` para atualização otimista imediata na Dashboard do Lojista sem esperar refetch.
3. **Lazy loading em imagens de card**: `AttachmentPreview` já tem, mas alguns carrosséis em `LojistaPublicProfilePage.tsx` ainda não passaram `loading="lazy"` para todos os `<img>`.
4. **Code splitting**: rotas pesadas (`LojistaPage`, `_authenticated.admin`, feeds) são grandes; ainda não estão em `React.lazy`. Ganha bundle inicial, mas não bloqueia.

## 🔴 PENDENTE — Não iniciado

1. **Rede de afiliados B2B com comissão por indicação** — requer schema novo (`referrals`, `commissions`), fluxo financeiro e RLS específica. Precisa decisão de produto (percentual? prazo? conciliação?).
2. **Push notifications reais** (badge de oportunidade dispara toast; falta integração com Web Push / FCM).
3. **Relatórios de auditoria exportáveis** no painel Admin (CSV/PDF).

---

## ✅ Checklist Pós-Execução

- [x] Relatório de auditoria gerado (`AUDITORIA.md`).
- [x] Modal Criar Serviço: header fixo com teclado, Frete/Outro, Fixo+% Comissão.
- [x] `scrollbar-none` disponível globalmente.
- [x] Cores contextuais por rota via `__root.tsx`.
- [x] RadiusFilter em todos os feeds + default do perfil.
- [x] Segurança: sem bypass hardcoded, RLS estrita em `profiles`, roles em tabela dedicada.
- [ ] Afiliados B2B — aguarda especificação de produto.
- [ ] Push notifications — aguarda decisão de provedor.
