-- FIXXER PROMPT 26: PERFORMANCE INDEXES
-- OBJETIVO: Otimizar consultas críticas de Feed, O.S. e Chat.

-- Feed e Anúncios
CREATE INDEX IF NOT EXISTS idx_feed_posts_author_type ON public.feed_posts (author_id, type);
CREATE INDEX IF NOT EXISTS idx_feed_posts_created_at ON public.feed_posts (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_posts_author_id ON public.posts (author_id);

-- O.S. e Propostas
CREATE INDEX IF NOT EXISTS idx_service_orders_customer_id ON public.service_orders (customer_id);
CREATE INDEX IF NOT EXISTS idx_service_orders_store_id ON public.service_orders (store_id);
CREATE INDEX IF NOT EXISTS idx_proposals_post_id ON public.proposals (post_id);
CREATE INDEX IF NOT EXISTS idx_proposals_provider_id ON public.proposals (provider_id);

-- Chat e Mensagens
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON public.messages (conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON public.messages (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_blocks_blocker_blocked ON public.user_blocks (blocker_id, blocked_id);

-- Notificações
CREATE INDEX IF NOT EXISTS idx_notifications_owner_read ON public.notifications (owner_id, read_at) WHERE read_at IS NULL;

ANALYZE public.feed_posts;
ANALYZE public.service_orders;
ANALYZE public.messages;
