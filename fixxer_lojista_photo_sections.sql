-- =====================================================================
-- FIXXER — Ajustes na tabela store_profiles (Lojista)
-- Novas colunas: franquia, fabricação própria e seções temáticas de fotos.
-- Execute manualmente no Supabase (SQL Editor).
-- =====================================================================

ALTER TABLE public.store_profiles
  ADD COLUMN IF NOT EXISTS is_franchise BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS franchise_name TEXT,
  ADD COLUMN IF NOT EXISTS own_manufacturing BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS photo_sections JSONB DEFAULT '{"showroom":[],"assemblies":[],"custom":[]}'::jsonb;

-- Garante que registros existentes tenham a estrutura padrão:
UPDATE public.store_profiles
SET photo_sections = '{"showroom":[],"assemblies":[],"custom":[]}'::jsonb
WHERE photo_sections IS NULL;

-- Índice opcional para consultas nas seções de fotos:
CREATE INDEX IF NOT EXISTS idx_store_profiles_photo_sections
  ON public.store_profiles USING gin (photo_sections);

-- =====================================================================
-- Verificação rápida:
-- SELECT id, user_email, is_franchise, franchise_name, own_manufacturing,
--        jsonb_array_length(coalesce(photo_sections->'showroom','[]'::jsonb)) AS showroom_count
-- FROM public.store_profiles LIMIT 10;
-- =====================================================================
