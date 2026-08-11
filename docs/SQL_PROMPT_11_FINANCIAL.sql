-- Script SQL para execução manual no Console do Supabase
-- OBJETIVO: Implementar o motor financeiro canônico e de afiliados (PROMPT_11)

-- 1. EXTENSÕES & TIPOS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'coin_tx_type') THEN
        CREATE TYPE public.coin_tx_type AS ENUM ('credit', 'debit');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'affiliate_status') THEN
        CREATE TYPE public.affiliate_status AS ENUM ('pending', 'active', 'blocked');
    END IF;
END $$;

-- 2. TABELA DE MOEDAS (LEDGER IMUTÁVEL)
CREATE TABLE IF NOT EXISTS public.coin_transactions (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    type public.coin_tx_type NOT NULL,
    amount integer NOT NULL CHECK (amount > 0),
    source text NOT NULL, -- 'purchase', 'bonus', 'consume', 'affiliate_reward'
    description text,
    idempotency_key text UNIQUE,
    reference_id text, -- ID da ordem, anúncio ou indicação
    balance_after integer,
    created_at timestamptz DEFAULT now() NOT NULL
);

-- 3. PERFIS DE AFILIADOS
CREATE TABLE IF NOT EXISTS public.affiliate_profiles (
    user_id uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
    code text UNIQUE NOT NULL,
    status public.affiliate_status DEFAULT 'active',
    commission_rate decimal(5,2) DEFAULT 10.00,
    total_earned integer DEFAULT 0,
    created_at timestamptz DEFAULT now()
);

-- 4. REGISTRO DE INDICAÇÕES (REFERRALS)
CREATE TABLE IF NOT EXISTS public.affiliate_referrals (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    affiliate_user_id uuid REFERENCES public.affiliate_profiles(user_id) NOT NULL,
    referred_user_id uuid REFERENCES auth.users(id) NOT NULL UNIQUE, 
    status text DEFAULT 'joined', -- 'joined', 'converted'
    converted_at timestamptz,
    created_at timestamptz DEFAULT now(),
    CONSTRAINT no_self_referral CHECK (affiliate_user_id <> referred_user_id)
);

-- 5. RPC: CRÉDITO SEGURO COM IDEMPOTÊNCIA
CREATE OR REPLACE FUNCTION public.credit_coins_safe(
    _user_id uuid,
    _amount integer,
    _source text,
    _description text,
    _idempotency_key text,
    _reference_id text DEFAULT NULL
)
RETURNS TABLE (success boolean, new_balance integer) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_current_balance integer;
BEGIN
    IF EXISTS (SELECT 1 FROM public.coin_transactions WHERE idempotency_key = _idempotency_key) THEN
        RETURN QUERY SELECT true, balance FROM public.user_coins WHERE user_id = _user_id;
        RETURN;
    END IF;

    INSERT INTO public.user_coins (user_id, balance)
    VALUES (_user_id, _amount)
    ON CONFLICT (user_id) DO UPDATE
    SET balance = public.user_coins.balance + EXCLUDED.balance,
        updated_at = now()
    RETURNING balance INTO v_current_balance;

    INSERT INTO public.coin_transactions (user_id, type, amount, source, description, idempotency_key, reference_id, balance_after)
    VALUES (_user_id, 'credit', _amount, _source, _description, _idempotency_key, _reference_id, v_current_balance);

    RETURN QUERY SELECT true, v_current_balance;
END;
$$;

-- 6. RPC: DÉBITO SEGURO COM TRAVA DE SALDO
CREATE OR REPLACE FUNCTION public.consume_coins_safe(
    _user_id uuid,
    _amount integer,
    _source text,
    _description text,
    _idempotency_key text,
    _reference_id text DEFAULT NULL
)
RETURNS TABLE (success boolean, new_balance integer, error_msg text) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_current_balance integer;
BEGIN
    IF EXISTS (SELECT 1 FROM public.coin_transactions WHERE idempotency_key = _idempotency_key) THEN
        SELECT balance INTO v_current_balance FROM public.user_coins WHERE user_id = _user_id;
        RETURN QUERY SELECT true, v_current_balance, NULL::text;
        RETURN;
    END IF;

    SELECT balance INTO v_current_balance FROM public.user_coins WHERE user_id = _user_id;
    IF v_current_balance IS NULL OR v_current_balance < _amount THEN
        RETURN QUERY SELECT false, COALESCE(v_current_balance, 0), 'Saldo insuficiente'::text;
        RETURN;
    END IF;

    UPDATE public.user_coins
    SET balance = balance - _amount,
        updated_at = now()
    WHERE user_id = _user_id
    RETURNING balance INTO v_current_balance;

    INSERT INTO public.coin_transactions (user_id, type, amount, source, description, idempotency_key, reference_id, balance_after)
    VALUES (_user_id, 'debit', _amount, _source, _description, _idempotency_key, _reference_id, v_current_balance);

    RETURN QUERY SELECT true, v_current_balance, NULL::text;
END;
$$;

-- 7. PERMISSÕES RLS & GRANTS
ALTER TABLE public.coin_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.affiliate_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.affiliate_referrals ENABLE ROW LEVEL SECURITY;

GRANT SELECT ON public.coin_transactions TO authenticated;
GRANT SELECT ON public.affiliate_profiles TO authenticated;
GRANT SELECT ON public.affiliate_referrals TO authenticated;

-- Grants for RPCs (Service Role can always run them, but defined as SECURITY DEFINER)
GRANT EXECUTE ON FUNCTION public.credit_coins_safe TO authenticated;
GRANT EXECUTE ON FUNCTION public.consume_coins_safe TO authenticated;

-- Políticas
DROP POLICY IF EXISTS "Users can view their own transactions" ON public.coin_transactions;
CREATE POLICY "Users can view their own transactions" ON public.coin_transactions
    FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view their own affiliate profile" ON public.affiliate_profiles;
CREATE POLICY "Users can view their own affiliate profile" ON public.affiliate_profiles
    FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Affiliates can view their referrals" ON public.affiliate_referrals;
CREATE POLICY "Affiliates can view their referrals" ON public.affiliate_referrals
    FOR SELECT TO authenticated USING (auth.uid() = affiliate_user_id);
