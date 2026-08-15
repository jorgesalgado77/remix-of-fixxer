-- MIGRATION: 20260813000007_info_admin_master_control.sql
-- OBJETIVO: Tabela de auditoria master e lógica de estorno/refund administrativa.

-- 1. Tabela de Logs de Auditoria Master
CREATE TABLE IF NOT EXISTS public.info_admin_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_id UUID REFERENCES auth.users(id) NOT NULL,
    action TEXT NOT NULL, -- 'REFUND', 'UPDATE_CONFIG', 'PAUSE_COUPON', etc
    entity_type TEXT NOT NULL, -- 'SALE', 'GLOBAL_CONFIG', 'COUPON'
    entity_id UUID,
    old_value JSONB,
    new_value JSONB,
    reason TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

GRANT SELECT, INSERT ON public.info_admin_audit_logs TO authenticated;
GRANT ALL ON public.info_admin_audit_logs TO service_role;

ALTER TABLE public.info_admin_audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view all logs" 
ON public.info_admin_audit_logs FOR SELECT 
TO authenticated 
USING (public.has_role(auth.uid(), 'admin'));

-- 2. RPC para Estorno Administrativo (Refund Master)
-- Esta função realiza o estorno no ledger, revoga o acesso e registra auditoria.
CREATE OR REPLACE FUNCTION public.admin_refund_sale(
    _sale_id UUID,
    _reason TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS 11758
DECLARE
    _sale RECORD;
    _admin_id UUID;
BEGIN
    _admin_id := auth.uid();
    
    -- Verificar se é admin
    IF NOT public.has_role(_admin_id, 'admin') THEN
        RAISE EXCEPTION 'Acesso negado: Requer privilégios de administrador.';
    END IF;

    -- Buscar venda
    SELECT * INTO _sale FROM public.info_sales WHERE id = _sale_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Venda não encontrada.';
    END IF;

    IF _sale.status = 'REFUNDED' THEN
        RETURN TRUE; -- Já estornado
    END IF;

    -- 1. Atualizar status da venda
    UPDATE public.info_sales 
    SET status = 'REFUNDED', 
        updated_at = now()
    WHERE id = _sale_id;

    -- 2. Revogar acesso (Entitlement)
    DELETE FROM public.info_product_entitlements
    WHERE user_id = _sale.buyer_id 
      AND product_id = _sale.product_id;

    -- 3. Registrar no Log de Auditoria
    INSERT INTO public.info_admin_audit_logs (
        admin_id,
        action,
        entity_type,
        entity_id,
        reason,
        old_value
    ) VALUES (
        _admin_id,
        'REFUND',
        'SALE',
        _sale_id,
        _reason,
        to_jsonb(_sale)
    );

    RETURN TRUE;
END;
11758;
