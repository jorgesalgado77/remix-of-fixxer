-- ADMIN_MASTER_REFACTOR_FINAL.sql
-- Objetivo: Garantia absoluta de acesso master e limpeza de restrições

-- 1. Remoção de Triggers que causam erro 500 no login
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS tr_profiles_sync_auth ON auth.users;

-- 2. Limpeza de restrições de status
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_status_chk;

-- 3. Inserção/Atualização do Admin Master
DO $$
DECLARE
    master_uid uuid := '6ba65048-803f-44f6-88d2-24d04fee1a0f';
BEGIN
    -- Garante que o profile existe
    INSERT INTO public.profiles (id, email, display_name, status, role)
    VALUES (master_uid, 'jorgericardosalgado@gmail.com', 'Admin Master', 'active', 'admin')
    ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        display_name = EXCLUDED.display_name,
        status = 'active',
        role = 'admin';

    -- Garante a role de admin
    INSERT INTO public.user_roles (user_id, role)
    VALUES (master_uid, 'admin')
    ON CONFLICT (user_id, role) DO NOTHING;
END $$;

-- 4. Permissões
GRANT SELECT ON public.profiles TO authenticated;
GRANT SELECT ON public.user_roles TO authenticated;

-- 5. Logs de auditoria (se a tabela existir)
DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'info_admin_audit_logs') THEN
        INSERT INTO public.info_admin_audit_logs (admin_id, action, details)
        VALUES ('6ba65048-803f-44f6-88d2-24d04fee1a0f', 'RECOVERY', 'Admin Master access refortified via SQL Emergency Patch');
    END IF;
END $$;
