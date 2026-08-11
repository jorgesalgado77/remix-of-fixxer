-- Primeiro, removemos a view para evitar conflitos de tipos ou colunas ao recriar
DROP VIEW IF EXISTS public.profiles_public;

-- Agora criamos a view do zero com todas as colunas canônicas (v1.0.0)
CREATE VIEW public.profiles_public AS
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
    p.activity_branch,
    p.preferred_service,
    p.job_roles,
    p.city,
    p.state,
    p.lat,
    p.lng,
    p.created_at,
    p.rating,
    p.is_online,
    p.neighborhood,
    p.preferred_subcategories
FROM public.profiles p
WHERE p.full_name IS NOT NULL;

-- Reatribuímos as permissões necessárias
GRANT SELECT ON public.profiles_public TO authenticated;
GRANT SELECT ON public.profiles_public TO anon;
GRANT ALL ON public.profiles_public TO service_role;

-- Comentário para auditoria de schema
COMMENT ON VIEW public.profiles_public IS 'View pública canônica (v1.0.0) - Sincronizada com a Matriz de Categorias.';
