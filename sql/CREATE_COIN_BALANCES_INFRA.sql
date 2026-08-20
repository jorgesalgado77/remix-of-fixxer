-- ==========================================================
-- MIGRATION: CRIAÇÃO DA TABELA coin_balances E INFRAESTRUTURA
-- Alvo: Supabase Externo (rnhgpxembtgupxnrohxo)
-- ==========================================================

-- 1. Criar a tabela coin_balances se não existir (Nova Tabela Principal)
CREATE TABLE IF NOT EXISTS public.coin_balances (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
    balance NUMERIC(15, 2) DEFAULT 0 NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now(),
    CONSTRAINT balance_non_negative CHECK (balance >= 0)
);

-- 2. Habilitar RLS e Permissões
ALTER TABLE public.coin_balances ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.coin_balances TO authenticated;
GRANT ALL ON public.coin_balances TO service_role;

-- 3. Políticas RLS para coin_balances
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'coin_balances' AND policyname = 'Users can view their own balance'
    ) THEN
        CREATE POLICY "Users can view their own balance" ON public.coin_balances
            FOR SELECT TO authenticated
            USING (auth.uid() = user_id);
    END IF;
END $$;

-- 4. Garantir que a tabela legado user_coins também tenha RLS e permissões (Segurança extra)
ALTER TABLE public.user_coins ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.user_coins TO authenticated;
GRANT ALL ON public.user_coins TO service_role;

-- 5. Função de Segurança para Crédito de Moedas (Idempotente)
CREATE OR REPLACE FUNCTION public.credit_coins_safe(
    _user_id UUID,
    _amount NUMERIC,
    _source TEXT,
    _description TEXT,
    _idempotency_key TEXT DEFAULT NULL,
    _reference_id TEXT DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
    new_bal NUMERIC;
BEGIN
    -- Verificar duplicidade se houver chave de idempotência
    IF _idempotency_key IS NOT NULL AND EXISTS (
        SELECT 1 FROM public.coin_transactions 
        WHERE user_id = _user_id AND reason = _idempotency_key
    ) THEN
        SELECT balance INTO new_bal FROM public.coin_balances WHERE user_id = _user_id;
        RETURN jsonb_build_object('success', true, 'new_balance', new_bal, 'duplicated', true);
    END IF;

    -- Upsert na tabela principal
    INSERT INTO public.coin_balances (user_id, balance, updated_at)
    VALUES (_user_id, _amount, now())
    ON CONFLICT (user_id) DO UPDATE 
    SET balance = public.coin_balances.balance + _amount, 
        updated_at = now()
    RETURNING balance INTO new_bal;

    -- Sincronizar na tabela legado para compatibilidade
    INSERT INTO public.user_coins (user_id, balance, updated_at)
    VALUES (_user_id, _amount, now())
    ON CONFLICT (user_id) DO UPDATE 
    SET balance = public.user_coins.balance + _amount, 
        updated_at = now();

    -- Registrar transação
    INSERT INTO public.coin_transactions (user_id, amount, reason, source, created_at)
    VALUES (_user_id, _amount, COALESCE(_idempotency_key, _description), _source, now());

    RETURN jsonb_build_object('success', true, 'new_balance', new_bal);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
