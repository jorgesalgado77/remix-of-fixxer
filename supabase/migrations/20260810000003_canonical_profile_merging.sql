-- Migração Canônica: Garantir colunas críticas no profiles
ALTER TABLE public.profiles
    ADD COLUMN IF NOT EXISTS display_name TEXT,
    ADD COLUMN IF NOT EXISTS custom_branch TEXT,
    ADD COLUMN IF NOT EXISTS service_radius_km INTEGER DEFAULT 50,
    ADD COLUMN IF NOT EXISTS is_online BOOLEAN DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS lat NUMERIC,
    ADD COLUMN IF NOT EXISTS lng NUMERIC,
    ADD COLUMN IF NOT EXISTS has_vehicle BOOLEAN DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS vehicle_type TEXT,
    ADD COLUMN IF NOT EXISTS available_for_transport BOOLEAN DEFAULT FALSE;

-- Atualizar View Pública para incluir novos campos
DROP VIEW IF EXISTS public.profiles_public;
CREATE OR REPLACE VIEW public.profiles_public AS
SELECT 
    id, full_name, display_name, role, company_name, avatar_url, banner_url,
    business_category, custom_branch, specialty, karma_score,
    city, state, neighborhood, lat, lng,
    has_vehicle, vehicle_type, available_for_transport, service_radius_km, is_online
FROM public.profiles
WHERE role IN ('prestador', 'fornecedor', 'lojista');

GRANT SELECT ON public.profiles_public TO authenticated, anon;
