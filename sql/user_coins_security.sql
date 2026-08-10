-- ==========================================================
-- SEGURANÇA: SALDO DE USUÁRIOS (user_coins) E TRANSAÇÕES
-- Execute este script no SQL Editor do seu Supabase Externo
-- ==========================================================

-- 1. Criar tabela de Moedas (se não existir)
CREATE TABLE IF NOT EXISTS public.user_coins (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
    balance NUMERIC(12, 2) DEFAULT 0,
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Habilitar RLS e Permissões
ALTER TABLE public.user_coins ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.user_coins TO authenticated;
GRANT ALL ON public.user_coins TO service_role;

-- Política: Usuário só lê o próprio saldo
CREATE POLICY "Users can view their own balance" ON public.user_coins
    FOR SELECT TO authenticated
    USING (auth.uid() = user_id);

-- 2. Tabela de Transações (Histórico)
CREATE TABLE IF NOT EXISTS public.coin_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    amount NUMERIC(12, 2) NOT NULL,
    reason TEXT,
    source TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Habilitar RLS e Permissões
ALTER TABLE public.coin_transactions ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.coin_transactions TO authenticated;
GRANT ALL ON public.coin_transactions TO service_role;

-- Política: Usuário só lê as próprias transações
CREATE POLICY "Users can view their own transactions" ON public.coin_transactions
    FOR SELECT TO authenticated
    USING (auth.uid() = user_id);

-- 3. Função para inicializar moedas para novos usuários
CREATE OR REPLACE FUNCTION public.handle_new_user_coins()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.user_coins (user_id, balance)
    VALUES (NEW.id, 0)
    ON CONFLICT (user_id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger ativado na criação de perfil
DROP TRIGGER IF EXISTS on_profile_created_init_coins ON public.profiles;
CREATE TRIGGER on_profile_created_init_coins
    AFTER INSERT ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_coins();
