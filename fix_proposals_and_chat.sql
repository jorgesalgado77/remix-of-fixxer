-- ==========================================================
-- 7. TABELA DE PROPOSTAS (proposals)
-- ==========================================================
CREATE TABLE IF NOT EXISTS public.proposals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id UUID REFERENCES public.feed_posts(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    price_value NUMERIC NOT NULL,
    description TEXT,
    attachments TEXT[] DEFAULT '{}',
    status TEXT DEFAULT 'Pendente', -- 'Pendente', 'Aceita', 'Recusada'
    created_at TIMESTAMPTZ DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.proposals TO authenticated;
GRANT ALL ON public.proposals TO service_role;

ALTER TABLE public.proposals ENABLE ROW LEVEL SECURITY;

-- Políticas de RLS para Propostas
CREATE POLICY "Authors of post view proposals" ON public.proposals
    FOR SELECT TO authenticated 
    USING (
        EXISTS (
            SELECT 1 FROM public.feed_posts 
            WHERE id = post_id AND user_id = auth.uid()
        )
    );

CREATE POLICY "Proposal owners view own" ON public.proposals
    FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users insert proposals" ON public.proposals
    FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- ==========================================================
-- 8. TABELA DE MENSAGENS / CHAT (messages)
-- ==========================================================
CREATE TABLE IF NOT EXISTS public.chat_conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id UUID REFERENCES public.feed_posts(id) ON DELETE SET NULL,
    user_a UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    user_b UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    last_message TEXT,
    last_message_at TIMESTAMPTZ DEFAULT now(),
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(user_a, user_b, post_id)
);

CREATE TABLE IF NOT EXISTS public.chat_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID REFERENCES public.chat_conversations(id) ON DELETE CASCADE NOT NULL,
    sender_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    content TEXT NOT NULL,
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.chat_conversations TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.chat_messages TO authenticated;
GRANT ALL ON public.chat_conversations TO service_role;
GRANT ALL ON public.chat_messages TO service_role;

ALTER TABLE public.chat_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

-- Políticas para Conversas
CREATE POLICY "Users view own conversations" ON public.chat_conversations
    FOR SELECT TO authenticated USING (auth.uid() = user_a OR auth.uid() = user_b);

-- Políticas para Mensagens
CREATE POLICY "Users view messages in own conversations" ON public.chat_messages
    FOR SELECT TO authenticated 
    USING (
        EXISTS (
            SELECT 1 FROM public.chat_conversations 
            WHERE id = conversation_id AND (user_a = auth.uid() || user_b = auth.uid())
        )
    );

CREATE POLICY "Users insert messages" ON public.chat_messages
    FOR INSERT TO authenticated WITH CHECK (auth.uid() = sender_id);

-- ==========================================================
-- 9. TRIGGERS DE AUTOMAÇÃO
-- ==========================================================

-- Incrementar contagem de propostas
CREATE OR REPLACE FUNCTION public.increment_proposal_count()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE public.feed_posts 
    SET proposals_count = proposals_count + 1 
    WHERE id = NEW.post_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER tr_increment_proposal_count
AFTER INSERT ON public.proposals
FOR EACH ROW EXECUTE FUNCTION public.increment_proposal_count();

-- Fechamento automático de demandas ao aceitar proposta
CREATE OR REPLACE FUNCTION public.handle_proposal_acceptance()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'Aceita' AND OLD.status != 'Aceita' THEN
        -- Fecha o post
        UPDATE public.feed_posts 
        SET status = 'Em_Execucao' 
        WHERE id = NEW.post_id;
        
        -- Recusa outras propostas (opcional)
        UPDATE public.proposals 
        SET status = 'Recusada' 
        WHERE post_id = NEW.post_id AND id != NEW.id AND status = 'Pendente';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER tr_handle_proposal_acceptance
AFTER UPDATE ON public.proposals
FOR EACH ROW EXECUTE FUNCTION public.handle_proposal_acceptance();
