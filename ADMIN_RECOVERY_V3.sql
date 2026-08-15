
-- ADMIN_RECOVERY_V3.sql
-- Objetivo: Restaurar acesso total do Admin Master corrigindo inconsistências no schema de roles.

DO $$
DECLARE
    target_email TEXT := 'jorgericardosalgado@gmail.com';
    target_user_id UUID;
BEGIN
    -- 1. Obter o ID do usuário na tabela auth.users
    SELECT id INTO target_user_id FROM auth.users WHERE email = target_email;

    IF target_user_id IS NULL THEN
        RAISE NOTICE 'Usuário % não encontrado no auth.users. Ele precisa se cadastrar primeiro ou o banco auth está inacessível.', target_email;
    ELSE
        RAISE NOTICE 'Usuário % encontrado com ID %', target_email, target_user_id;

        -- 2. Garantir que a Role 'admin' existe no Enum
        BEGIN
            IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'app_role') THEN
                CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user', 'lojista', 'prestador', 'fornecedor', 'cliente');
            ELSE
                -- Tenta adicionar 'admin' se não existir no enum
                ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'admin';
            END IF;
        EXCEPTION WHEN others THEN
            RAISE NOTICE 'Aviso ao gerenciar ENUM app_role: %', SQLERRM;
        END;

        -- 3. Criar tabela user_roles se não existir
        CREATE TABLE IF NOT EXISTS public.user_roles (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
            role public.app_role NOT NULL,
            unique (user_id, role)
        );

        -- 4. Inserir a role admin para o usuário
        INSERT INTO public.user_roles (user_id, role)
        VALUES (target_user_id, 'admin')
        ON CONFLICT (user_id, role) DO NOTHING;

        -- 5. Garantir que o perfil existe e está ativo
        -- Nota: Usamos INSERT ... ON CONFLICT para ser resiliente a constraints
        BEGIN
            INSERT INTO public.profiles (id, full_name, role, status, updated_at)
            VALUES (target_user_id, 'Admin Master', 'admin', 'active', now())
            ON CONFLICT (id) DO UPDATE 
            SET role = 'admin', 
                status = 'active', 
                updated_at = now()
            WHERE profiles.id = target_user_id;
        EXCEPTION WHEN others THEN
            RAISE NOTICE 'Erro ao atualizar profiles: %. Continuando...', SQLERRM;
        END;

        -- 6. Configurar RLS básica para user_roles (Leitura para autenticados)
        ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
        
        DROP POLICY IF EXISTS "Users can read their own roles" ON public.user_roles;
        CREATE POLICY "Users can read their own roles" ON public.user_roles
        FOR SELECT TO authenticated USING (auth.uid() = user_id);

        DROP POLICY IF EXISTS "Admins can read all roles" ON public.user_roles;
        CREATE POLICY "Admins can read all roles" ON public.user_roles
        FOR SELECT TO authenticated USING (
            EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'admin')
        );

        -- 7. Grant total para o usuário Admin Master na tabela user_roles
        GRANT ALL ON public.user_roles TO authenticated;
        GRANT ALL ON public.user_roles TO service_role;

        RAISE NOTICE 'Recuperação de Admin concluída com sucesso.';
    END IF;
END $$;
