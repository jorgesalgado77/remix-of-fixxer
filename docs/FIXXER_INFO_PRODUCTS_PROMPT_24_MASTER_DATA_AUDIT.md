# REGRAS MESTRAS FIXXER — INFO PRODUTOS
## PROMPT 24 — MASTER DATA CONSOLIDATION & IDENTITY HARDENING

### OBJETIVO
Padronizar a fonte de dados de identidade em todo o ecossistema FIXXER, garantindo que o Admin Master e usuários de teste exibam dados reais (foto, saldo, reputação, localização) sincronizados com o banco de dados externo, eliminando inconsistências visuais e loops de hidratação.

### REQUISITOS DE HARDENING
1. **Sincronização de Identidade**: O `resolveIdentity` deve ser a fonte única de verdade, alimentando o `current-user` e componentes de UI.
2. **Bypass Síncrono**: Garantir que metadados críticos (avatar, display_name, localização) estejam disponíveis no `localStorage` para renderização imediata sem flash de "Usuário".
3. **Resiliência de Dados**: Se o banco de dados externo estiver offline, o sistema deve degradar para metadados salvos na última sessão bem-sucedida.
4. **Alinhamento Master**: O Admin Master (`jorgericardosalgado@gmail.com`) deve ter privilégios totais e identidade visual inalterável em qualquer rota.

### AÇÕES EXECUTADAS
- **Refatoração do Bypass**: Atualizado `src/lib/current-user.ts` para disparar `resolveIdentity` imediatamente durante a resolução do bypass.
- **Hardening de Avatar**: Corrigida a lógica de fallback no `identity-service.ts` para priorizar `logo_url` do perfil base.
- **Correção de Card**: `ProfileSummaryCard.tsx` agora injeta localização e dados master de forma síncrona via `localStorage`.
- **Alinhamento de Permissões**: `availability.ts` e `PanelActions.tsx` atualizados para reconhecer IDs de bypass master no roteamento e permissões.

### VERIFICAÇÃO ZERO-DEFECT
- [ ] Avatar do Master aparece imediatamente após o login.
- [ ] Saldo de 1500 moedas reflete no badge lateral sem F5.
- [ ] Localização "São Paulo / SP" exibida corretamente no card resumo.
- [ ] Link de "Meu Perfil" no PanelActions aponta para o ID real do bypass.

---
*Documento gerado automaticamente para auditoria de integridade de dados.*
