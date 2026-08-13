-- PROMPT 15: AFILIADOS HARDENING & FULL TRACKING
-- Este script expande a infraestrutura de afiliados para suportar antifraude, 
-- métricas de tracking e gestão avançada de links.

-- 1. Tabela de Logs de Cliques (Tracking de Cliques)
CREATE TABLE IF NOT EXISTS public.info_affiliate_clicks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    affiliate_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    product_id UUID REFERENCES public.info_products(id) ON DELETE CASCADE,
    tracking_code TEXT NOT NULL,
    ip_address TEXT,
    user_agent TEXT,
    referrer TEXT,
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Tabela de Auditoria de Eventos de Afiliado (Fraude/Status)
CREATE TABLE IF NOT EXISTS public.info_affiliate_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    affiliate_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    event_type TEXT NOT NULL, -- 'commission_revoked', 'fraud_detected', 'self_referral_blocked', 'limit_reached'
    product_id UUID REFERENCES public.info_products(id),
    payload JSONB,
    created_by UUID REFERENCES auth.users(id), -- Admin ou System
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Configurações Globais de Afiliados (Admin Master)
CREATE TABLE IF NOT EXISTS public.info_affiliate_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    max_commission_percent NUMERIC(5,2) DEFAULT 50.00,
    min_payout_amount NUMERIC(10,2) DEFAULT 100.00,
    self_referral_allowed BOOLEAN DEFAULT FALSE,
    cookie_duration_days INTEGER DEFAULT 30,
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Inserir config default
INSERT INTO public.info_affiliate_settings (id) VALUES (gen_random_uuid()) ON CONFLICT DO NOTHING;

-- 4. Grants
GRANT SELECT ON public.info_affiliate_clicks TO authenticated;
GRANT ALL ON public.info_affiliate_clicks TO service_role;
GRANT SELECT ON public.info_affiliate_audit_logs TO authenticated;
GRANT ALL ON public.info_affiliate_audit_logs TO service_role;
GRANT SELECT ON public.info_affiliate_settings TO authenticated;
GRANT ALL ON public.info_affiliate_settings TO service_role;

-- 5. RLS
ALTER TABLE public.info_affiliate_clicks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.info_affiliate_audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.info_affiliate_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Affiliates can see their click counts"
ON public.info_affiliate_clicks FOR SELECT TO authenticated
USING (affiliate_id = auth.uid());

CREATE POLICY "Affiliates can see their audit logs"
ON public.info_affiliate_audit_logs FOR SELECT TO authenticated
USING (affiliate_id = auth.uid());

CREATE POLICY "Everyone can see settings"
ON public.info_affiliate_settings FOR SELECT TO authenticated
USING (true);

-- 6. Função de Processamento de Venda com Afiliado (Anti-Fraude & Split)
-- Atualizando a função existente ou criando uma nova mais robusta
CREATE OR REPLACE FUNCTION public.process_affiliate_sale_v2(
    _sale_id UUID,
    _product_id UUID,
    _buyer_id UUID,
    _tracking_code TEXT,
    _amount_total NUMERIC
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    _aff_record RECORD;
    _comm_amount NUMERIC;
    _settings RECORD;
    _creator_id UUID;
BEGIN
    -- 1. Carregar Configs
    SELECT * INTO _settings FROM public.info_affiliate_settings LIMIT 1;
    
    -- 2. Carregar Produto/Criador
    SELECT creator_id INTO _creator_id FROM public.info_products WHERE id = _product_id;
    
    -- 3. Busca a regra de comissão ativa
    SELECT * INTO _aff_record
    FROM public.info_affiliates
    WHERE tracking_code = _tracking_code
      AND status = 'active'
      AND (product_id = _product_id OR product_id IS NULL)
    LIMIT 1;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('processed', false, 'reason', 'invalid_tracking_code');
    END IF;

    -- 4. ANTI-FRAUDE: Self-Referral
    IF NOT _settings.self_referral_allowed AND _aff_record.affiliate_id = _buyer_id THEN
        INSERT INTO public.info_affiliate_audit_logs (affiliate_id, event_type, product_id, payload)
        VALUES (_aff_record.affiliate_id, 'self_referral_blocked', _product_id, jsonb_build_object('buyer_id', _buyer_id));
        
        RETURN jsonb_build_object('processed', false, 'reason', 'self_referral_detected');
    END IF;

    -- 5. Calcular Comissão
    _comm_amount := (_amount_total * _aff_record.commission_percent) / 100;

    -- 6. Registrar Venda de Afiliado
    INSERT INTO public.info_affiliate_sales (
        sale_id,
        affiliate_id,
        product_id,
        amount_total,
        commission_amount,
        status
    ) VALUES (
        _sale_id,
        _aff_record.affiliate_id,
        _product_id,
        _amount_total,
        _comm_amount,
        'pending'
    );

    RETURN jsonb_build_object(
        'processed', true, 
        'affiliate_id', _aff_record.affiliate_id, 
        'commission', _comm_amount,
        'creator_id', _creator_id
    );
END;
$$;
