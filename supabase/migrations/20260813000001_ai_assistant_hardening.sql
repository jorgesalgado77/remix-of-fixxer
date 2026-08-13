-- Adicionar tabela de logs de uso e limites por criador
CREATE TABLE IF NOT EXISTS public.info_ai_usage (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    creator_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    provider_id TEXT NOT NULL,
    suggestion_type TEXT NOT NULL,
    tokens_used INTEGER DEFAULT 0,
    cost_estimated NUMERIC(10, 5) DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Adicionar tabela de histórico de sugestões para reversão
CREATE TABLE IF NOT EXISTS public.info_ai_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    creator_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    product_id UUID, -- Opcional se for um novo produto ainda não salvo
    field_name TEXT NOT NULL,
    old_value TEXT,
    suggested_value TEXT NOT NULL,
    applied_at TIMESTAMPTZ DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.info_ai_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.info_ai_history ENABLE ROW LEVEL SECURITY;

-- Grants
GRANT SELECT, INSERT ON public.info_ai_usage TO authenticated;
GRANT ALL ON public.info_ai_usage TO service_role;

GRANT SELECT, INSERT ON public.info_ai_history TO authenticated;
GRANT ALL ON public.info_ai_history TO service_role;

-- Políticas
CREATE POLICY "Creators can view their own AI usage"
ON public.info_ai_usage FOR SELECT
TO authenticated
USING (creator_id = auth.uid());

CREATE POLICY "Creators can insert their own AI usage"
ON public.info_ai_usage FOR INSERT
TO authenticated
WITH CHECK (creator_id = auth.uid());

CREATE POLICY "Creators can view their own AI history"
ON public.info_ai_history FOR SELECT
TO authenticated
USING (creator_id = auth.uid());

CREATE POLICY "Creators can insert their own AI history"
ON public.info_ai_history FOR INSERT
TO authenticated
WITH CHECK (creator_id = auth.uid());

-- Índices
CREATE INDEX idx_info_ai_usage_creator ON public.info_ai_usage(creator_id);
CREATE INDEX idx_info_ai_history_creator ON public.info_ai_history(creator_id);
