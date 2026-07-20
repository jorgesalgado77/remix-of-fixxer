import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/api/public/setup-db')({
  server: {
    handlers: {
      GET: async () => {
        return new Response(`
# WEBAPP FIXXER - CONFIGURAÇÃO DO BANCO DE DADOS EXTERNO

Siga os passos abaixo para garantir que o Supabase esteja pronto para o sistema:

1. Acesse o SQL Editor no seu painel do Supabase.
2. Crie uma nova query.
3. Copie e cole o conteúdo do arquivo 'src/integrations/supabase/complete_schema.sql' localizado na pasta do projeto.
4. Execute o script.

Este script SQL completo automatiza:
- Criação dos Enums de usuários (admin, lojista, prestador, fornecedor).
- Tabela de perfis sincronizada com o Auth.
- Trigger de criação automática de perfil no cadastro.
- Identificação automática do e-mail jorgericardosalgado@gmail.com como administrador master.
- Políticas de Segurança (RLS) e permissões de acesso.

Caso o usuário já exista no Auth, execute manualmente:
UPDATE public.profiles SET role = 'admin' WHERE id = (SELECT id FROM auth.users WHERE email = 'jorgericardosalgado@gmail.com');
INSERT INTO public.user_roles (user_id, role) VALUES ((SELECT id FROM auth.users WHERE email = 'jorgericardosalgado@gmail.com'), 'admin') ON CONFLICT DO NOTHING;
        `, {
          headers: { 'Content-Type': 'text/plain; charset=utf-8' }
        })
      }
    }
  }
})