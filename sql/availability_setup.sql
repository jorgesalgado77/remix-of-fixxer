-- ============================================================================
-- FIXXER — DISPONIBILIDADE, AUDITORIA E TENTATIVAS DE CONTATO
-- Rode este script no editor SQL do Supabase EXTERNO (VITE_SUPABASE_URL)
-- ============================================================================

-- 1) Status atual de disponibilidade por usuário
CREATE TABLE IF NOT EXISTS public.user_availability (
  user_id       uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  is_available  boolean NOT NULL DEFAULT true,
  note          text,
  updated_at    timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.user_availability TO anon, authenticated;
GRANT INSERT, UPDATE ON public.user_availability TO authenticated;
GRANT ALL ON public.user_availability TO service_role;

ALTER TABLE public.user_availability ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "avail_public_read" ON public.user_availability;
CREATE POLICY "avail_public_read" ON public.user_availability
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "avail_owner_write" ON public.user_availability;
CREATE POLICY "avail_owner_write" ON public.user_availability
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "avail_owner_update" ON public.user_availability;
CREATE POLICY "avail_owner_update" ON public.user_availability
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 2) Auditoria — cada mudança
CREATE TABLE IF NOT EXISTS public.availability_log (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  changed_by    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  is_available  boolean NOT NULL,
  note          text,
  changed_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS availability_log_user_idx
  ON public.availability_log (user_id, changed_at DESC);

GRANT SELECT, INSERT ON public.availability_log TO authenticated;
GRANT ALL ON public.availability_log TO service_role;

ALTER TABLE public.availability_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "log_owner_read" ON public.availability_log;
CREATE POLICY "log_owner_read" ON public.availability_log
  FOR SELECT USING (auth.uid() = user_id OR auth.uid() = changed_by);

DROP POLICY IF EXISTS "log_owner_insert" ON public.availability_log;
CREATE POLICY "log_owner_insert" ON public.availability_log
  FOR INSERT WITH CHECK (auth.uid() = changed_by);

-- 3) Tentativas de contato durante indisponibilidade
CREATE TABLE IF NOT EXISTS public.contact_attempts (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  target_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  attempter_id  uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  attempted_at  timestamptz NOT NULL DEFAULT now(),
  notified      boolean NOT NULL DEFAULT false,
  UNIQUE (target_user_id, attempter_id, notified)
);

CREATE INDEX IF NOT EXISTS contact_attempts_target_idx
  ON public.contact_attempts (target_user_id, notified, attempted_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.contact_attempts TO authenticated;
GRANT ALL ON public.contact_attempts TO service_role;

ALTER TABLE public.contact_attempts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "attempts_target_read" ON public.contact_attempts;
CREATE POLICY "attempts_target_read" ON public.contact_attempts
  FOR SELECT USING (auth.uid() = target_user_id OR auth.uid() = attempter_id);

DROP POLICY IF EXISTS "attempts_attempter_insert" ON public.contact_attempts;
CREATE POLICY "attempts_attempter_insert" ON public.contact_attempts
  FOR INSERT WITH CHECK (auth.uid() = attempter_id);

DROP POLICY IF EXISTS "attempts_target_update" ON public.contact_attempts;
CREATE POLICY "attempts_target_update" ON public.contact_attempts
  FOR UPDATE USING (auth.uid() = target_user_id) WITH CHECK (auth.uid() = target_user_id);

-- 4) Notificações genéricas (para "voltei a estar disponível", etc.)
CREATE TABLE IF NOT EXISTS public.notifications (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_id  uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kind          text NOT NULL,
  title         text NOT NULL,
  body          text,
  meta          jsonb DEFAULT '{}'::jsonb,
  read_at       timestamptz,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS notifications_recipient_idx
  ON public.notifications (recipient_id, read_at NULLS FIRST, created_at DESC);

GRANT SELECT, INSERT, UPDATE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "notif_recipient_read" ON public.notifications;
CREATE POLICY "notif_recipient_read" ON public.notifications
  FOR SELECT USING (auth.uid() = recipient_id);

-- qualquer autenticado pode criar notificação para outro usuário
DROP POLICY IF EXISTS "notif_any_insert" ON public.notifications;
CREATE POLICY "notif_any_insert" ON public.notifications
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "notif_recipient_update" ON public.notifications;
CREATE POLICY "notif_recipient_update" ON public.notifications
  FOR UPDATE USING (auth.uid() = recipient_id) WITH CHECK (auth.uid() = recipient_id);
