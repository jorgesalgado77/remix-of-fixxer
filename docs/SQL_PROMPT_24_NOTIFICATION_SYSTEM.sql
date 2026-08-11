-- FIXXER — PROMPT 24: REAL NOTIFICATION EVENT SYSTEM
-- Consolidação da tabela de notificações e políticas RLS

CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    sender_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    type TEXT NOT NULL, -- info, success, warning, danger, chat, system
    event_key TEXT NOT NULL, -- appointment_new, proposal_accepted, etc.
    title TEXT,
    content TEXT,
    link TEXT,
    read_at TIMESTAMP WITH TIME ZONE,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Habilitar RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Políticas de RLS
CREATE POLICY "Users View Own Notifications" ON public.notifications
    FOR SELECT TO authenticated
    USING (auth.uid() = owner_id);

CREATE POLICY "Users Update Own Notifications" ON public.notifications
    FOR UPDATE TO authenticated
    USING (auth.uid() = owner_id)
    WITH CHECK (auth.uid() = owner_id);

-- Permitir que o sistema insira notificações (via trigger ou server functions)
GRANT ALL ON public.notifications TO service_role;
GRANT SELECT, UPDATE ON public.notifications TO authenticated;

-- Tabela de Preferências de Notificação (Já referenciada no Prompt 16)
CREATE TABLE IF NOT EXISTS public.notification_preferences (
    user_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
    preferences JSONB DEFAULT '{}'::jsonb,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users Manage Own Preferences" ON public.notification_preferences
    FOR ALL TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

GRANT ALL ON public.notification_preferences TO service_role;
GRANT SELECT, INSERT, UPDATE ON public.notification_preferences TO authenticated;

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_notifications_owner_id ON public.notifications(owner_id);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON public.notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_read_at ON public.notifications(read_at) WHERE read_at IS NULL;

-- Trigger para atualização automática de updated_at nas preferências
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER tr_update_notification_prefs_timestamp
    BEFORE UPDATE ON public.notification_preferences
    FOR EACH ROW EXECUTE PROCEDURE public.update_updated_at_column();
