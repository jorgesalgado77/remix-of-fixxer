-- ==========================================================
-- RECOVERY V27: SINCRONIZAÇÃO DE SALDOS REAIS (PÓS-MIGRATION)
-- Execute este script APÓS CREATE_COIN_BALANCES_INFRA.sql
-- ==========================================================

DO $$
DECLARE
    jorge_id UUID;
    admin_id UUID;
    jorge_email TEXT := 'jorgecriare2021@gmail.com';
    admin_email TEXT := 'jorgericardosalgado@gmail.com';
BEGIN
    -- Recuperar IDs reais
    SELECT id INTO jorge_id FROM auth.users WHERE email = jorge_email LIMIT 1;
    SELECT id INTO admin_id FROM auth.users WHERE email = admin_email LIMIT 1;

    -- Sincronizar Jorge Salgado (3600 moedas)
    IF jorge_id IS NOT NULL THEN
        -- Upsert em coin_balances
        INSERT INTO public.coin_balances (user_id, balance, updated_at)
        VALUES (jorge_id, 3600, now())
        ON CONFLICT (user_id) DO UPDATE SET balance = 3600, updated_at = now();

        -- Upsert em user_coins
        INSERT INTO public.user_coins (user_id, balance, updated_at)
        VALUES (jorge_id, 3600, now())
        ON CONFLICT (user_id) DO UPDATE SET balance = 3600, updated_at = now();
        
        RAISE NOTICE 'Saldo de Jorge Salgado sincronizado para 3600.';
    END IF;

    -- Sincronizar Admin Master (5000 moedas)
    IF admin_id IS NOT NULL THEN
        INSERT INTO public.coin_balances (user_id, balance, updated_at)
        VALUES (admin_id, 5000, now())
        ON CONFLICT (user_id) DO UPDATE SET balance = 5000, updated_at = now();
        
        INSERT INTO public.user_coins (user_id, balance, updated_at)
        VALUES (admin_id, 5000, now())
        ON CONFLICT (user_id) DO UPDATE SET balance = 5000, updated_at = now();
    END IF;

END $$;
