-- MIGRATION: 20260811_CHAT_CANONICAL_HARDENING
-- OBJETIVO: Unificar a tabela de mensagens, aplicar RLS de bloqueio e garantir integridade.

-- 1. GARANTIR A TABELA CANÔNICA 'messages'
-- (O schema consolidado já a define, mas reforçamos os campos necessários)
CREATE TABLE IF NOT EXISTS public.messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sender_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    recipient_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    content TEXT,
    attachment_url TEXT,
    attachment_type TEXT, -- 'image', 'video', 'document', 'audio'
    attachment_name TEXT,
    read BOOLEAN DEFAULT FALSE,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexação para performance de busca de conversas
CREATE INDEX IF NOT EXISTS idx_messages_conversation ON public.messages (sender_id, recipient_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_recipient_unread ON public.messages (recipient_id) WHERE read = FALSE;

-- 2. TABELA DE BLOQUEIOS (SE NÃO EXISTIR)
CREATE TABLE IF NOT EXISTS public.user_blocks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    blocker_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    blocked_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(blocker_id, blocked_id)
);

ALTER TABLE public.user_blocks ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, DELETE ON public.user_blocks TO authenticated;
GRANT ALL ON public.user_blocks TO service_role;

CREATE POLICY "Users can manage their own blocks" 
ON public.user_blocks FOR ALL TO authenticated 
USING (auth.uid() = blocker_id);

-- 3. SEGURANÇA RLS PARA MENSAGENS (COM ANTI-BLOQUEIO)
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Limpeza de políticas antigas para evitar conflitos
DROP POLICY IF EXISTS "Messages Participant Access" ON public.messages;
DROP POLICY IF EXISTS "Users view own messages" ON public.messages;
DROP POLICY IF EXISTS "Users insert own messages" ON public.messages;

-- Política de Leitura: Participantes podem ver as mensagens
CREATE POLICY "Messages Participant Read Access" 
ON public.messages FOR SELECT TO authenticated 
USING (auth.uid() = sender_id OR auth.uid() = recipient_id);

-- Política de Escrita: Não permitir enviar mensagens se houver bloqueio
CREATE POLICY "Messages Insert Access with Block Check" 
ON public.messages FOR INSERT TO authenticated 
WITH CHECK (
    auth.uid() = sender_id 
    AND NOT EXISTS (
        SELECT 1 FROM public.user_blocks 
        WHERE (blocker_id = sender_id AND blocked_id = recipient_id)
           OR (blocker_id = recipient_id AND blocked_id = sender_id)
    )
);

-- 4. GRANTS
GRANT SELECT, INSERT, UPDATE ON public.messages TO authenticated;
GRANT ALL ON public.messages TO service_role;

-- 5. STORAGE BUCKETS
-- O bucket 'chat-attachments' deve ser privado
-- Configuração manual no painel Supabase ou via API se disponível.
-- Políticas de storage recomendadas:
-- auth.uid() = (storage.foldername(name))[1]::uuid OR ...
