-- PROMPT 13: AFILIADOS & ARQUITETURA V3-READY
-- Este script define a infraestrutura para o sistema de afiliados e garante que o núcleo de Info Produtos
-- seja agnóstico quanto ao tipo de criador (V3 Readiness).

-- 1. Tabela de Configuração de Afiliados por Criador/Produto
CREATE TABLE IF NOT EXISTS public.info_affiliates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    creator_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    product_id UUID REFERENCES public.info_products(id) ON DELETE CASCADE, -- NULL significa global para o creator
    affiliate_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    commission_percent NUMERIC(5,2) NOT NULL DEFAULT 10.00,
    status TEXT NOT NULL CHECK (status IN ('active', 'paused', 'banned')) DEFAULT 'active',
    tracking_code TEXT UNIQUE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(creator_id, affiliate_id, product_id)
);

-- 2. Registro de Vendas com Atribuição de Afiliado (Ledger-ready)
CREATE TABLE IF NOT EXISTS public.info_affiliate_sales (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sale_id UUID NOT NULL, -- FK para a tabela de vendas/ledger principal se houver, ou ref interna
    affiliate_id UUID NOT NULL REFERENCES auth.users(id),
    product_id UUID NOT NULL REFERENCES public.info_products(id),
    amount_total NUMERIC(10,2) NOT NULL,
    commission_amount NUMERIC(10,2) NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('pending', 'paid', 'refunded', 'canceled')) DEFAULT 'pending',
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Grants
GRANT SELECT, INSERT, UPDATE ON public.info_affiliates TO authenticated;
GRANT ALL ON public.info_affiliates TO service_role;
GRANT SELECT ON public.info_affiliate_sales TO authenticated;
GRANT ALL ON public.info_affiliate_sales TO service_role;

-- 4. RLS - Segurança de Afiliados
ALTER TABLE public.info_affiliates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.info_affiliate_sales ENABLE ROW LEVEL SECURITY;

-- Criador pode ver/gerenciar seus afiliados
CREATE POLICY "Creators can manage their affiliates"
ON public.info_affiliates
FOR ALL
TO authenticated
USING (creator_id = auth.uid());

-- Afiliado pode ver suas próprias parcerias
CREATE POLICY "Affiliates can view their partnerships"
ON public.info_affiliates
FOR SELECT
TO authenticated
USING (affiliate_id = auth.uid());

-- Afiliado não pode ser afiliado de si mesmo (Prevenção de Self-Referral)
CREATE POLICY "No self-referral"
ON public.info_affiliates
FOR INSERT
TO authenticated
WITH CHECK (creator_id != affiliate_id AND affiliate_id = auth.uid());

-- RLS para Vendas de Afiliados
CREATE POLICY "Affiliates can see their sales"
ON public.info_affiliate_sales
FOR SELECT
TO authenticated
USING (affiliate_id = auth.uid());

CREATE POLICY "Creators can see affiliate sales of their products"
ON public.info_affiliate_sales
FOR SELECT
TO authenticated
USING (EXISTS (
    SELECT 1 FROM public.info_products 
    WHERE id = product_id AND creator_id = auth.uid()
));

-- 5. Função de Atribuição Segura (Bypass RLS para Webhook)
CREATE OR REPLACE FUNCTION public.apply_affiliate_commission(
    _product_id UUID,
    _tracking_code TEXT,
    _sale_amount NUMERIC
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    _aff_record RECORD;
    _comm_amount NUMERIC;
BEGIN
    -- Busca a regra de comissão ativa
    SELECT * INTO _aff_record
    FROM public.info_affiliates
    WHERE tracking_code = _tracking_code
      AND status = 'active'
      AND (product_id = _product_id OR product_id IS NULL)
    LIMIT 1;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('applied', false, 'reason', 'invalid_tracking_code');
    END IF;

    _comm_amount := (_sale_amount * _aff_record.commission_percent) / 100;

    INSERT INTO public.info_affiliate_sales (
        affiliate_id,
        product_id,
        amount_total,
        commission_amount,
        status
    ) VALUES (
        _aff_record.affiliate_id,
        _product_id,
        _sale_amount,
        _comm_amount,
        'pending'
    );

    RETURN jsonb_build_object('applied', true, 'affiliate_id', _aff_record.affiliate_id, 'commission', _comm_amount);
END;
$$;
