CREATE TABLE IF NOT EXISTS public.activity_branches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT UNIQUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

GRANT SELECT, INSERT ON public.activity_branches TO authenticated;
GRANT ALL ON public.activity_branches TO service_role;

-- Inserir valores iniciais
INSERT INTO public.activity_branches (name) 
VALUES ('Móveis Planejados'), ('Marcenaria')
ON CONFLICT (name) DO NOTHING;
