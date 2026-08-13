-- PROMPT 14: EDUCATION HARDENING & ANALYTICS
-- Este script expande a infraestrutura para branding de certificados, notificações e métricas de validação.

-- 1. Tabela de Branding de Certificados por Criador
CREATE TABLE IF NOT EXISTS public.info_creator_branding (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    creator_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    logo_url TEXT,
    primary_color TEXT DEFAULT '#00FF87',
    footer_text TEXT,
    signature_url TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(creator_id)
);

-- 2. Registro de Métricas de Validação Pública
CREATE TABLE IF NOT EXISTS public.info_certificate_validation_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    creator_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    certificate_id UUID REFERENCES public.info_certificates(id) ON DELETE SET NULL,
    status TEXT NOT NULL CHECK (status IN ('success', 'failed', 'rate_limited')),
    error_type TEXT,
    ip_hash TEXT, -- Hash do IP para rate limiting sem PII
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Grants
GRANT SELECT, INSERT, UPDATE ON public.info_creator_branding TO authenticated;
GRANT ALL ON public.info_creator_branding TO service_role;
GRANT SELECT, INSERT ON public.info_certificate_validation_metrics TO authenticated;
GRANT SELECT ON public.info_certificate_validation_metrics TO anon;
GRANT ALL ON public.info_certificate_validation_metrics TO service_role;

-- 4. RLS
ALTER TABLE public.info_creator_branding ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.info_certificate_validation_metrics ENABLE ROW LEVEL SECURITY;

-- Criador gerencia seu próprio branding
CREATE POLICY "Creators can manage their branding"
ON public.info_creator_branding
FOR ALL
TO authenticated
USING (creator_id = auth.uid());

-- Auditoria de métricas (Admin pode ver tudo, Creator vê o seu)
CREATE POLICY "Admins can view all validation metrics"
ON public.info_certificate_validation_metrics
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Creators can view their own validation metrics"
ON public.info_certificate_validation_metrics
FOR SELECT
TO authenticated
USING (creator_id = auth.uid());

-- 5. Índices para performance em Analytics
CREATE INDEX IF NOT EXISTS idx_cert_val_metrics_creator ON public.info_certificate_validation_metrics(creator_id);
CREATE INDEX IF NOT EXISTS idx_cert_val_metrics_created_at ON public.info_certificate_validation_metrics(created_at);
