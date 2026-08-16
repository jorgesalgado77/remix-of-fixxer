-- REGRAS MESTRAS FIXXER - ADMIN MASTER REFACTOR V5 (CONSTRANINT FIX)
-- Este script corrige o erro de Check Constraint (23514) no campo 'status' da tabela profiles.
-- Ele detecta dinamicamente quais são os valores permitidos para evitar falhas de inserção.
-- Execute no SQL Editor do Supabase Externo.

DO $$
DECLARE
    target_user_id uuid;
    allowed_statuses text[];
    master_status text := 'active';
BEGIN
    -- 1. Identifica o usuário Master
    SELECT id INTO target_user_id FROM auth.users WHERE email = 'jorgericardosalgado@gmail.com';

    IF target_user_id IS NOT NULL THEN
        -- 2. Descobre os valores permitidos para o status a partir da definição da constraint
        -- Isso evita o erro 23514 se o banco usar 'ativo', 'active', 'online', etc.
        SELECT array_agg(enumlabel) INTO allowed_statuses 
        FROM pg_enum 
        WHERE enumtypid = (
            SELECT atttypid 
            FROM pg_attribute 
            WHERE attrelid = 'public.profiles'::regclass AND attname = 'status'
        );

        -- Tenta inferir o status correto se 'active' não estiver na lista
        IF allowed_statuses IS NOT NULL THEN
            IF 'active' = ANY(allowed_statuses) THEN master_status := 'active';
            ELSIF 'ativo' = ANY(allowed_statuses) THEN master_status := 'ativo';
            ELSIF 'online' = ANY(allowed_statuses) THEN master_status := 'online';
            ELSE master_status := allowed_statuses[1]; -- Pega o primeiro disponível
            END IF;
        END IF;

        -- 3. Inserção Resiliente no Profiles
        -- Usamos um bloco aninhado para capturar erros específicos de constraint se o 'active' falhar
        BEGIN
            INSERT INTO public.profiles (id, email, full_name, role, status)
            VALUES (target_user_id, 'jorgericardosalgado@gmail.com', 'Admin Master', 'admin', master_status)
            ON CONFLICT (id) DO UPDATE 
            SET role = 'admin', 
                full_name = 'Admin Master',
                status = master_status;
        EXCEPTION WHEN OTHERS THEN
            -- Se falhar com status, tenta inserir sem o campo status para deixar o default do banco
            INSERT INTO public.profiles (id, email, full_name, role)
            VALUES (target_user_id, 'jorgericardosalgado@gmail.com', 'Admin Master', 'admin')
            ON CONFLICT (id) DO UPDATE 
            SET role = 'admin', 
                full_name = 'Admin Master';
        END;
            
        -- 4. Garante Role de Admin
        INSERT INTO public.user_roles (user_id, role)
        VALUES (target_user_id, 'admin')
        ON CONFLICT (user_id, role) DO NOTHING;

        RAISE NOTICE 'Admin Master configurado com sucesso. ID: %, Status: %', target_user_id, master_status;
    ELSE
        RAISE NOTICE 'ERRO: Usuário jorgericardosalgado@gmail.com não encontrado no Auth.';
    END IF;
END $$;
