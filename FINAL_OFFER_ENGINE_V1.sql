-- FIXXER — INFO PRODUTOS
-- PROMPT 23 — OFFER ENGINE V1 / COMMERCIAL OFFERS
-- MIGRATION: 20240325_offer_engine_v1.sql

-- 1. Enum para status da oferta
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'info_offer_status') THEN
        CREATE TYPE public.info_offer_status AS ENUM ('DRAFT', 'ACTIVE', 'PAUSED', 'EXPIRED', 'SOLD_OUT', 'ARCHIVED');
    END IF;
END
$$;

-- 2. Tabela de Ofertas
CREATE TABLE IF NOT EXISTS public.info_offers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    creator_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    product_id UUID REFERENCES public.info_products(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    price DECIMAL(12,2) NOT NULL CHECK (price >= 0),
    compare_at_price DECIMAL(12,2) CHECK (compare_at_price IS NULL OR compare_at_price > 0),
    max_sales INTEGER CHECK (max_sales IS NULL OR max_sales > 0),
    sales_count INTEGER DEFAULT 0 NOT NULL,
    starts_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    expires_at TIMESTAMPTZ,
    status public.info_offer_status DEFAULT 'DRAFT' NOT NULL,
    is_featured BOOLEAN DEFAULT FALSE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Indexação para performance
CREATE INDEX IF NOT EXISTS idx_info_offers_creator ON public.info_offers(creator_id);
CREATE INDEX IF NOT EXISTS idx_info_offers_product ON public.info_offers(product_id);
CREATE INDEX IF NOT EXISTS idx_info_offers_status ON public.info_offers(status);

-- 3. RLS
ALTER TABLE public.info_offers ENABLE ROW LEVEL SECURITY;

-- Grants
GRANT SELECT ON public.info_offers TO authenticated;
GRANT SELECT ON public.info_offers TO anon;
GRANT INSERT, UPDATE, DELETE ON public.info_offers TO authenticated;
GRANT ALL ON public.info_offers TO service_role;

-- Policies
CREATE POLICY "Qualquer um pode ver ofertas ativas"
ON public.info_offers FOR SELECT
USING (status = 'ACTIVE' OR auth.uid() = creator_id);

CREATE POLICY "Criadores gerenciam suas próprias ofertas"
ON public.info_offers FOR ALL
TO authenticated
USING (auth.uid() = creator_id)
WITH CHECK (auth.uid() = creator_id);

-- 4. RPC de Validação e Aplicação de Oferta
CREATE OR REPLACE FUNCTION public.validate_and_apply_info_offer(
    _offer_id UUID,
    _product_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_offer RECORD;
BEGIN
    -- Busca a oferta com lock para evitar race conditions em limites de venda
    SELECT * INTO v_offer
    FROM public.info_offers
    WHERE id = _offer_id AND product_id = _product_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('valid', false, 'error', 'Oferta não encontrada');
    END IF;

    -- Validações de status e validade
    IF v_offer.status != 'ACTIVE' THEN
        RETURN jsonb_build_object('valid', false, 'error', 'Esta oferta não está mais ativa');
    END IF;

    IF v_offer.expires_at IS NOT NULL AND v_offer.expires_at < NOW() THEN
        -- Auto-expira se necessário
        UPDATE public.info_offers SET status = 'EXPIRED' WHERE id = _offer_id;
        RETURN jsonb_build_object('valid', false, 'error', 'Esta oferta expirou');
    END IF;

    IF v_offer.max_sales IS NOT NULL AND v_offer.sales_count >= v_offer.max_sales THEN
        -- Auto-sold_out
        UPDATE public.info_offers SET status = 'SOLD_OUT' WHERE id = _offer_id;
        RETURN jsonb_build_object('valid', false, 'error', 'Limite de vendas atingido para esta oferta');
    END IF;

    -- Retorna os dados da oferta validada
    RETURN jsonb_build_object(
        'valid', true,
        'offer_id', v_offer.id,
        'final_price', v_offer.price,
        'compare_at_price', v_offer.compare_at_price
    );
END;
$$;

-- 5. Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_info_offers_updated_at ON public.info_offers;
CREATE TRIGGER tr_info_offers_updated_at
BEFORE UPDATE ON public.info_offers
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- 6. Adicionar offer_id à tabela de compras (info_sales) se não existir
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'info_sales' AND column_name = 'offer_id') THEN
        ALTER TABLE public.info_sales ADD COLUMN offer_id UUID REFERENCES public.info_offers(id);
    END IF;
END
$$;

