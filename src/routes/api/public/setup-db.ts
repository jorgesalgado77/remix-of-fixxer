import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/api/public/setup-db')({
  server: {
    handlers: {
      GET: async () => {
        return new Response(`
# PASSO A PASSO: CONEXÃO SUPABASE EXTERNO (FIXXER)

## 1. Criar Projeto no Supabase
- Vá para [supabase.com](https://supabase.com) e crie um novo projeto chamado "FIXXER".

## 2. Configurar o Banco de Dados
- No painel do Supabase, vá em **SQL Editor**.
- Copie o conteúdo do arquivo \`src/integrations/supabase/schema.sql\` e execute-o.
- Isso criará as tabelas de perfis, papéis e a lógica de automação.

## 3. Configurar Variáveis de Ambiente
- Vá em **Project Settings > API**.
- Copie a **Project URL** e a **anon public key**.
- Adicione no seu ambiente (ou arquivo .env):
  - \`VITE_SUPABASE_URL=sua_url_aqui\`
  - \`VITE_SUPABASE_ANON_KEY=sua_chave_aqui\`

## 4. Criar Administrador Master
- Você pode criar o administrador via painel (**Authentication > Users > Add User**) ou via código.
- Dados solicitados:
  - **Email:** jorgericardosalgado@gmail.com
  - **Senha:** !jR17052
- Após criar, certifique-se de atribuir o papel 'admin' na tabela \`user_roles\`.

## 5. Integração no Código
- O cliente Supabase já está configurado em \`src/integrations/supabase/client.ts\`.
- Use \`import { supabase } from '@/integrations/supabase/client'\` para realizar chamadas.
        `, {
          headers: { 'Content-Type': 'text/markdown; charset=utf-8' }
        });
      }
    }
  }
});
