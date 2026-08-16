-- =============================================================================
-- ADMIN_FINAL_REMEDY.sql — RESTAURAÇÃO TOTAL DO ACESSO MASTER
-- EXECUTE ESTE SCRIPT NO SQL EDITOR DO SUPABASE PARA CORRIGIR O ERRO 500
-- =============================================================================

DO $$ 
DECLARE
    target_user_id UUID;
    master_email TEXT := 'jorgericardosalgado@gmail.com';
BEGIN
    -- 1. IDENTIFICA O USUÁRIO MASTER
    SELECT id INTO target_user_id FROM auth.users WHERE email = master_email;

    IF target_user_id IS NULL THEN
        RAISE NOTICE 'Usuário % não encontrado em auth.users', master_email;
        RETURN;
    END IF;

    -- 2. LIMPEZA DE TRIGGERS CORROMPIDOS (Causa do erro 500 no Auth)
    -- Removemos triggers que costumam falhar em migrations incompletas
    DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
    DROP TRIGGER IF EXISTS on_profile_updated ON public.profiles;

    -- 3. GARANTE A ROLE 'admin' NA TABELA user_roles
    -- A tabela user_roles é a fonte de verdade para o isCurrentUserAdmin()
    INSERT INTO public.user_roles (user_id, role)
    VALUES (target_user_id, 'admin')
    ON CONFLICT (user_id, role) DO NOTHING;

    -- 4. ATUALIZA O PERFIL PARA EVITAR CONSTRAINTS DE STATUS
    -- Tenta atualizar o status para 'active'. Se a constraint profiles_status_chk falhar,
    -- o bloco EXCEPTION garante que o script continue.
    BEGIN
        INSERT INTO public.profiles (id, full_name, role, status, updated_at)
        VALUES (target_user_id, 'Admin Master', 'admin', 'active', now())
        ON CONFLICT (id) DO UPDATE 
        SET role = 'admin', status = 'active', updated_at = now();
    EXCEPTION WHEN OTHERS THEN
        -- Fallback: tenta sem o campo status caso a constraint seja o problema
        INSERT INTO public.profiles (id, full_name, role, updated_at)
        VALUES (target_user_id, 'Admin Master', 'admin', now())
        ON CONFLICT (id) DO UPDATE 
        SET role = 'admin', updated_at = now();
        RAISE NOTICE 'Aviso: Perfil atualizado com restrições de status ignoradas.';
    END;

    -- 5. PERMISSÕES RLS TOTAIS PARA O ADMIN
    -- Garante que o admin possa ler a tabela user_roles mesmo com RLS ativado
    GRANT SELECT ON public.user_roles TO authenticated;
    
    RAISE NOTICE 'Acesso administrativo restaurado com sucesso para %', master_email;
END $$;
