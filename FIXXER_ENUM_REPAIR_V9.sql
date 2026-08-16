
-- FIXXER_ENUM_REPAIR_V9.sql
-- Objetivo: Corrigir erro de cast de string para enum 'user' e sincronizar Roles Master.

DO $$
DECLARE
    admin_email TEXT := 'jorgericardosalgado@gmail.com';
    prestador_email TEXT := 'jorgecriare2021@gmail.com';
    admin_id UUID;
    prestador_id UUID;
BEGIN
    -- 1. Capturar IDs reais do Auth Externo
    SELECT id INTO admin_id FROM auth.users WHERE email = admin_email;
    SELECT id INTO prestador_id FROM auth.users WHERE email = prestador_email;

    -- 2. Corrigir/Expandir ENUM app_role
    -- O erro 22P02 indica que 'user' foi enviado mas não existe no ENUM ou o cast falhou.
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'app_role') THEN
        CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'lojista', 'prestador', 'fornecedor', 'cliente', 'user');
    ELSE
        -- Adicionar valores faltantes com segurança
        ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'admin';
        ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'lojista';
        ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'prestador';
        ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'fornecedor';
        ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'cliente';
        ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'user';
    END IF;

    -- 3. Assegurar Tabela de Roles com tipos corretos
    CREATE TABLE IF NOT EXISTS public.user_roles (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
        role public.app_role NOT NULL,
        UNIQUE (user_id, role)
    );

    -- 4. Sincronizar Permissões Master
    IF admin_id IS NOT NULL THEN
        INSERT INTO public.user_roles (user_id, role)
        VALUES (admin_id, 'admin'::public.app_role)
        ON CONFLICT (user_id, role) DO NOTHING;
        
        UPDATE public.profiles 
        SET role = 'admin', status = 'active' 
        WHERE id = admin_id;
    END IF;

    IF prestador_id IS NOT NULL THEN
        -- Aqui resolvemos o erro do prompt: inserindo como 'prestador' em vez de 'user' genérico
        INSERT INTO public.user_roles (user_id, role)
        VALUES (prestador_id, 'prestador'::public.app_role)
        ON CONFLICT (user_id, role) DO NOTHING;

        UPDATE public.profiles 
        SET role = 'prestador', status = 'active' 
        WHERE id = prestador_id;
    END IF;

    -- 5. Grants e RLS
    GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_roles TO authenticated;
    GRANT ALL ON public.user_roles TO service_role;
    
    ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

    RAISE NOTICE 'Reparo de ENUM e Sincronização V9 concluídos.';
END $$;
