-- Certificados
CREATE TABLE public.info_certificates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) NOT NULL,
    product_id UUID REFERENCES public.info_products(id) NOT NULL,
    creator_id UUID REFERENCES auth.users(id) NOT NULL,
    course_name TEXT NOT NULL,
    student_name TEXT NOT NULL,
    creator_name TEXT NOT NULL,
    workload_hours INTEGER NOT NULL DEFAULT 0,
    issued_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    unique_code TEXT UNIQUE NOT NULL,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'revoked')),
    created_at TIMESTAMPTZ DEFAULT now()
);

GRANT SELECT ON public.info_certificates TO authenticated;
GRANT ALL ON public.info_certificates TO service_role;
GRANT SELECT ON public.info_certificates TO anon;

ALTER TABLE public.info_certificates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own certificates" 
ON public.info_certificates FOR SELECT TO authenticated 
USING (user_id = auth.uid());

CREATE POLICY "Public validation by unique code" 
ON public.info_certificates FOR SELECT TO anon 
USING (status = 'active');

-- Bundles (Combos)
CREATE TABLE public.info_bundles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    creator_id UUID REFERENCES auth.users(id) NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    price DECIMAL(12,2) NOT NULL,
    items UUID[] NOT NULL DEFAULT '{}',
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

GRANT SELECT ON public.info_bundles TO authenticated;
GRANT SELECT ON public.info_bundles TO anon;
GRANT ALL ON public.info_bundles TO service_role;

ALTER TABLE public.info_bundles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view published bundles" 
ON public.info_bundles FOR SELECT 
USING (status = 'published');

CREATE POLICY "Creators can manage their bundles" 
ON public.info_bundles FOR ALL TO authenticated 
USING (creator_id = auth.uid());

-- Assinaturas (Planos)
CREATE TABLE public.info_subscription_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT,
    price_monthly DECIMAL(12,2) NOT NULL,
    price_yearly DECIMAL(12,2) NOT NULL,
    catalog_access_rules JSONB NOT NULL DEFAULT '{}',
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    created_at TIMESTAMPTZ DEFAULT now()
);

GRANT SELECT ON public.info_subscription_plans TO authenticated;
GRANT SELECT ON public.info_subscription_plans TO anon;
GRANT ALL ON public.info_subscription_plans TO service_role;

ALTER TABLE public.info_subscription_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active plans" 
ON public.info_subscription_plans FOR SELECT 
USING (status = 'active');

-- Destaques (Promoted Products)
CREATE TABLE public.info_promoted_products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID REFERENCES public.info_products(id) NOT NULL,
    creator_id UUID REFERENCES auth.users(id) NOT NULL,
    start_at TIMESTAMPTZ NOT NULL,
    end_at TIMESTAMPTZ NOT NULL,
    rules JSONB DEFAULT '{}',
    status TEXT NOT NULL DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT now()
);

GRANT SELECT ON public.info_promoted_products TO authenticated;
GRANT SELECT ON public.info_promoted_products TO anon;
GRANT ALL ON public.info_promoted_products TO service_role;

ALTER TABLE public.info_promoted_products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active promotions" 
ON public.info_promoted_products FOR SELECT 
USING (status = 'active' AND now() BETWEEN start_at AND end_at);
