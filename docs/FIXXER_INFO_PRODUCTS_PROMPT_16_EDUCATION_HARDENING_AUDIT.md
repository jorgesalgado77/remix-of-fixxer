# Auditoria FIXXER — Info Produtos — Prompt 16
## Educação Hardening, Preview & Alertas

### 1. Banco de Dados & Monitoramento
- [x] Migração `20260813000005_info_education_v3_hardening.sql` aplicada.
- [x] Tabela `info_security_alerts` para detecção de anomalias e picos de falha.
- [x] Tabela `info_certificate_notifications` para gestão de reenvios sem duplicidade.
- [x] Função RPC `check_validation_anomalies` para auto-trigger de alertas críticos.

### 2. Branding & Live Preview
- [x] Aba "Preview" adicionada ao Admin Master com editor lateral.
- [x] Visualização em tempo real do layout do certificado com branding customizado.
- [x] Persistência de identidade visual integrada via `saveCreatorBranding`.

### 3. Gestão de Notificações & Segurança
- [x] Função `resendCertificateNotification` para reenvio manual via Admin.
- [x] Dashboard de Alertas de Segurança com status de severidade (Crítico/Alto).
- [x] Proteção Anti-PIX e Anti-Brute force na validação pública (simulada via rate limit).

### 4. Qualidade & Testes
- [x] Build Success (Corrigido erro de hierarquia JSX e tipos AdminTab).
- [x] Typecheck Success.
- [x] Teste de integração criado em `src/tests/info-education-v3.spec.ts`.
- [x] QR Code visual integrado ao preview para validação rápida.

**Status: CONCLUÍDO**
