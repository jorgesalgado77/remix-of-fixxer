CREATE OR REPLACE VIEW public.profiles_public AS
SELECT 
    p.id,
    p.full_name,
    p.display_name,
    p.company_name,
    p.avatar_url,
    p.logo_url,
    p.banner_url,
    p.role,
    p.user_type,
    p.business_category,
    p.custom_branch,
    p.preferred_service,
    p.job_roles,
    p.city,
    p.state,
    p.lat,
    p.lng,
    p.created_at,
    p.rating,
    p.is_online,
    p.neighborhood
FROM public.profiles p
WHERE p.full_name IS NOT NULL;

GRANT SELECT ON public.profiles_public TO authenticated;
GRANT SELECT ON public.profiles_public TO anon;
GRANT ALL ON public.profiles_public TO service_role;
