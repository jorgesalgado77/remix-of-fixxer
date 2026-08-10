# SECURITY CREDENTIAL ROTATION

Este documento descreve as credenciais que foram identificadas como expostas no histórico do repositório ou em arquivos de configuração e que **DEVEM** ser rotacionadas imediatamente em ambiente de produção.

## ⚠️ Credenciais Críticas para Rotação

| Tipo | Identificador/Contexto | Ação Necessária |
| :--- | :--- | :--- |
| **Senha Admin Master** | E-mail `jorgericardosalgado@gmail.com` | Alterar a senha via painel administrativo ou CLI do Supabase. A senha anterior `!jR...` está comprometida. |
| **Supabase Service Role Key** | Variáveis de ambiente / Scripts legados | Se a `service_role` key foi exposta em qualquer commit, ela deve ser regenerada no painel do Supabase. |
| **Tokens de API** | `check_user_coords.js` e outros scripts | Verificar se chaves privadas foram usadas em scripts de manutenção e rotacioná-las. |

## 🛡️ Medidas de Prevenção Implementadas

1. **Remoção de Bypass**: O gatilho `handle_new_user` não concede mais privilégios de administrador baseados em e-mail.
2. **RBAC**: Toda autorização agora depende da tabela `public.user_roles` e da função `has_role()`.
3. **Limpeza de SQL**: Credenciais literais foram removidas das migrations de hardening.

## 📝 Procedimento de Rotação para o Admin

1. Acesse o Supabase Dashboard.
2. Vá em **Authentication** -> **Users**.
3. Localize o usuário `jorgericardosalgado@gmail.com`.
4. Use a opção **Change Password** para definir uma nova credencial forte.
5. Verifique se o usuário possui a entrada correta na tabela `user_roles` com a role `admin`.

---
*Gerado automaticamente durante auditoria de segurança em 10/08/2026.*
