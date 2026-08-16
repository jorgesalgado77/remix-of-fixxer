-- MIGRATION: RECOVERY_MASTER_DATA_V8 (RESOLVE UNIQUE EMAIL)
-- OBJETIVO: Sincronizar perfis e financeiro aproveitando usuários AUTH já existentes.
-- Resolve o erro 23505 (violação de constraint de email único).
-- Executar no Console SQL do Supabase Externo: https://rnhgpxembtgupxnrohxo.supabase.co

-- 1. Identificar e atualizar os IDs na nossa lógica de bypass se os emails já existem com outros IDs
-- O erro 23505 indica que os emails já estão no auth.users, mas possivelmente com IDs diferentes dos hardcoded.
-- Para resolver sem deletar usuários reais, vamos forçar a atualização dos perfis e financeiro para os emails informados.

DO $$
DECLARE
    admin_id uuid;
    prestador_id uuid;
BEGIN
    -- Pegar os IDs reais que já existem no auth.users para esses emails
    SELECT id INTO admin_id FROM auth.users WHERE email = 'jorgericardosalgado@gmail.com' LIMIT 1;
    SELECT id INTO prestador_id FROM auth.users WHERE email = 'jorgecriare2021@gmail.com' LIMIT 1;

    -- Se não existirem (o que seria estranho dado o erro 23505), mantemos os hardcoded
    IF admin_id IS NULL THEN admin_id := '6ba65048-803f-44f6-88d2-24d04fee1a0f'; END IF;
    IF prestador_id IS NULL THEN prestador_id := 'b3378b88-5c46-4e50-9c2e-4b7264a4d6e9'; END IF;

    -- 2. Atualizar/Inserir Perfis
    INSERT INTO public.profiles (id, display_name, email, role, user_type, business_category, updated_at)
    VALUES 
      (admin_id, 'Admin Master', 'jorgericardosalgado@gmail.com', 'admin', 'admin', 'admin', now()),
      (prestador_id, 'Prestador Teste', 'jorgecriare2021@gmail.com', 'prestador', 'prestador', 'prestador', now())
    ON CONFLICT (id) DO UPDATE SET 
      display_name = EXCLUDED.display_name,
      role = EXCLUDED.role,
      updated_at = now();

    -- 3. Roles
    INSERT INTO public.user_roles (user_id, role)
    VALUES (admin_id, 'admin'), (prestador_id, 'user')
    ON CONFLICT (user_id, role) DO NOTHING;

    -- 4. Financeiro
    INSERT INTO public.user_coins (user_id, balance, updated_at)
    VALUES (admin_id, 999999, now()), (prestador_id, 1000, now())
    ON CONFLICT (user_id) DO UPDATE SET 
      balance = COALESCE(public.user_coins.balance, EXCLUDED.balance),
      updated_at = now();
      
    RAISE NOTICE 'Sincronização concluída. IDs detectados: Admin(%), Prestador(%)', admin_id, prestador_id;
END $$;
