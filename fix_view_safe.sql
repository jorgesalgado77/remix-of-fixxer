-- Forçamos a remoção da view e de quaisquer objetos que dependam dela (CASCADE)
-- para garantir que não haja conflitos de nomes ou tipos de colunas.
DROP VIEW IF EXISTS public.profiles_public CASCADE;

-- Recriamos a view com a ordem exata e nomes de colunas da tabela base
CREATE VIEW public.profiles_public AS
SELECT 
    id,
    full_name,
    display_name,
    company_name,
    avatar_url,
    logo_url,
    banner_url,
    role,
    user_type,
    business_category,
    custom_branch,
    activity_branch,
    preferred_service,
    job_roles,
    city,
    state,
    lat,
    lng,
    created_at,
    rating,
    is_online,
    neighborhood,
    preferred_subcategories
FROM public.profiles
WHERE full_name IS NOT NULL;

-- Restauramos as permissões
GRANT SELECT ON public.profiles_public TO authenticated;
GRANT SELECT ON public.profiles_public TO anon;
GRANT ALL ON public.profiles_public TO service_role;

COMMENT ON VIEW public.profiles_public IS 'View pública canônica v1.0.0 - Recriada com CASCADE para evitar conflitos de renomeação.';
