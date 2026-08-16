-- REGRAS MESTRAS FIXXER - ADMIN MASTER RECOVERY V4
-- Este script realiza a refatoração total do usuário administrador master.
-- Remove privilégios de qualquer outro administrador prévio e garante acesso pleno ao novo Admin Master.
-- Execute no SQL Editor do Supabase Externo.

-- 1. Limpeza de Administradores Anteriores (Segurança)
-- Remove a role 'admin' de todos os usuários exceto o novo Master (se já existir)
-- para garantir que apenas jorgericardosalgado@gmail.com tenha acesso master.
DELETE FROM public.user_roles 
WHERE role = 'admin' 
AND user_id NOT IN (
    SELECT id FROM auth.users WHERE email = 'jorgericardosalgado@gmail.com'
);

-- 2. Garantir Estrutura de Roles
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'app_role') THEN
        CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');
    END IF;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 3. Identificação e Configuração do Usuário Master
-- Nota: O usuário deve ser criado via Auth (Cadastro/Login) primeiro.
-- Este script associa os privilégios ao e-mail jorgericardosalgado@gmail.com.
DO $$
DECLARE
    target_user_id uuid;
BEGIN
    -- Busca o ID do usuário pelo e-mail
    SELECT id INTO target_user_id FROM auth.users WHERE email = 'jorgericardosalgado@gmail.com';

    IF target_user_id IS NOT NULL THEN
        -- Atualiza Perfil
        INSERT INTO public.profiles (id, email, full_name, role, status)
        VALUES (target_user_id, 'jorgericardosalgado@gmail.com', 'Admin Master', 'admin', 'active')
        ON CONFLICT (id) DO UPDATE 
        SET role = 'admin', 
            full_name = 'Admin Master',
            status = 'active';
            
        -- Garante Role de Admin na tabela de permissões
        INSERT INTO public.user_roles (user_id, role)
        VALUES (target_user_id, 'admin')
        ON CONFLICT (user_id, role) DO NOTHING;

        RAISE NOTICE 'Admin Master configurado para o ID: %', target_user_id;
    ELSE
        RAISE NOTICE 'USUÁRIO NÃO ENCONTRADO: O e-mail jorgericardosalgado@gmail.com deve estar cadastrado no Auth.';
    END IF;
END $$;

-- 4. Blindagem de Acesso (RLS e Grants)
-- Garante que usuários autenticados possam ler suas próprias roles e admins leiam tudo
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can do everything on user_roles" ON public.user_roles;
CREATE POLICY "Admins can do everything on user_roles"
ON public.user_roles
FOR ALL
TO authenticated
USING (
  (SELECT role FROM public.user_roles WHERE user_id = auth.uid() LIMIT 1) = 'admin'
  OR auth.jwt() ->> 'email' = 'jorgericardosalgado@gmail.com'
);

GRANT ALL ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
GRANT ALL ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
