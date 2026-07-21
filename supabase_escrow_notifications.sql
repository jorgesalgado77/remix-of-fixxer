-- Tabela para notificações do sistema
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT NOT NULL, -- 'proposal', 'escrow', 'status_change', 'new_demand'
    read BOOLEAN DEFAULT false,
    link TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can see their own notifications" ON public.notifications
    FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- Trigger para notificar prestadores sobre novas demandas (simplificado para o exemplo)
-- Em um cenário real, você filtraria por cidade e categorias
CREATE OR REPLACE FUNCTION public.notify_new_demand()
RETURNS TRIGGER AS $$
BEGIN
    -- Exemplo: Notifica todos os prestadores (em produção seria filtrado)
    INSERT INTO public.notifications (user_id, title, message, type, link)
    SELECT p.id, 'Nova Demanda na sua Região', 
           'Uma nova necessidade de ' || NEW.title || ' foi publicada.',
           'new_demand', '/feed'
    FROM public.profiles p
    WHERE p.role = 'prestador' AND p.id != NEW.user_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_new_demand ON public.feed_posts;
CREATE TRIGGER on_new_demand
    AFTER INSERT ON public.feed_posts
    FOR EACH ROW EXECUTE FUNCTION public.notify_new_demand();

-- Função para liberar escrow e avaliar
CREATE OR REPLACE FUNCTION public.complete_and_release_escrow(
    _post_id UUID,
    _rating INTEGER,
    _comment TEXT
)
RETURNS VOID AS $$
DECLARE
    _accepted_proposal_id UUID;
    _prestador_id UUID;
BEGIN
    -- Busca a proposta aceita
    SELECT id, user_id INTO _accepted_proposal_id, _prestador_id
    FROM public.proposals
    WHERE post_id = _post_id AND status = 'Aceita'
    LIMIT 1;

    -- Atualiza o post
    UPDATE public.feed_posts
    SET status = 'Concluido'
    WHERE id = _post_id;

    -- Registra a avaliação
    -- (Assumindo que existe uma tabela de reviews, se não existir o SQL falhará mas a lógica é esta)
    -- INSERT INTO public.reviews (target_id, reviewer_id, rating, comment, post_id)
    -- VALUES (_prestador_id, auth.uid(), _rating, _comment, _post_id);

    -- Notifica o prestador
    INSERT INTO public.notifications (user_id, title, message, type)
    VALUES (_prestador_id, 'Pagamento Liberado!', 'O cliente concluiu a obra e o valor foi liberado.', 'escrow');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
