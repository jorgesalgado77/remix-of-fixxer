-- SCRIPT DE REPARAÇÃO ESTRUTURAL DO SUPABASE (ADMIN MASTER)
-- Execute este script completo no SQL Editor do Supabase.
-- Ele resolve o erro 500 (unexpected_failure) e garante o acesso.

-- 1. Desabilitar Triggers de Auth Temporariamente (se houver algum quebrado)
-- O erro 500 no Supabase Auth muitas vezes é causado por triggers na tabela profiles
-- que falham durante o sign-in/sign-up.

DO $$
BEGIN
    -- 2. Garantir que as tabelas base existam com a estrutura correta
    CREATE TABLE IF NOT EXISTS public.user_roles (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id uuid NOT NULL,
        role text NOT NULL,
        created_at timestamptz DEFAULT now(),
        UNIQUE(user_id, role)
    );

    -- 3. Habilitar RLS e permissões básicas para evitar erro de permissão no login
    ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
    
    DROP POLICY IF EXISTS "Allow users to read their own roles" ON public.user_roles;
    CREATE POLICY "Allow users to read their own roles" 
    ON public.user_roles FOR SELECT 
    USING (auth.uid() = user_id);

    -- 4. Criar função has_role se não existir (necessária para guards)
    CREATE OR REPLACE FUNCTION public.has_role(uid uuid, requested_role text)
    RETURNS boolean AS $$$
    BEGIN
      RETURN EXISTS (
        SELECT 1 FROM public.user_roles 
        WHERE user_id = uid AND role = requested_role
      );
    END;
    $$$ LANGUAGE plpgsql SECURITY DEFINER;

    -- 5. Vincular o administrador
    DECLARE
        admin_id uuid;
    BEGIN
        SELECT id INTO admin_id FROM auth.users WHERE email = 'jorgericardosalgado@gmail.com';
        
        IF admin_id IS NOT NULL THEN
            -- Garante role admin
            INSERT INTO public.user_roles (user_id, role)
            VALUES (admin_id, 'admin')
            ON CONFLICT (user_id, role) DO NOTHING;
            
            -- Garante perfil ativo
            INSERT INTO public.profiles (id, full_name, role, status)
            VALUES (admin_id, 'Admin Master', 'admin', 'active')
            ON CONFLICT (id) DO UPDATE SET role = 'admin', status = 'active';
            
            RAISE NOTICE 'Administrador Master vinculado com sucesso. ID: %', admin_id;
        ELSE
            RAISE NOTICE 'ERRO: Usuário jorgericardosalgado@gmail.com não encontrado no Auth do Supabase.';
        END IF;
    END;
END $$;

-- 6. Garantir Grants para a API
GRANT SELECT ON public.user_roles TO authenticated;
GRANT SELECT ON public.profiles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
GRANT ALL ON public.profiles TO service_role;
