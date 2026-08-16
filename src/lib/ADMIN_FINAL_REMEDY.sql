-- ADMIN_FINAL_REMEDY_V3.sql
-- OBJETIVO: Limpar triggers corrompidas e garantir privilégios de Admin Master
-- A ser executado no Console SQL do Supabase Externo

-- 1. Remoção de triggers que podem estar causando o erro 500 no Auth
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- 2. Garantir que a role 'admin' exista no enum
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'app_role') THEN
        CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');
    END IF;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 3. Inserir ou atualizar o perfil do Admin Master de forma resiliente
DO $$
DECLARE
    master_uid uuid := '6ba65048-803f-44f6-88d2-24d04fee1a0f';
BEGIN
    -- Tenta inserir no profiles sem status caso o constraint esteja quebrado
    INSERT INTO public.profiles (id, email, full_name, role)
    VALUES (master_uid, 'jorgericardosalgado@gmail.com', 'Admin Master', 'admin')
    ON CONFLICT (id) DO UPDATE 
    SET role = 'admin', full_name = 'Admin Master';
    
    -- Tenta atualizar o status separadamente para não quebrar o resto
    BEGIN
        UPDATE public.profiles SET status = 'active' WHERE id = master_uid;
    EXCEPTION WHEN OTHERS THEN
        UPDATE public.profiles SET status = 'ativo' WHERE id = master_uid;
    END;
END $$;

-- 4. Garantir a role na tabela user_roles
INSERT INTO public.user_roles (user_id, role)
VALUES ('6ba65048-803f-44f6-88d2-24d04fee1a0f', 'admin')
ON CONFLICT (user_id, role) DO NOTHING;

-- 5. Privilégios Master
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
