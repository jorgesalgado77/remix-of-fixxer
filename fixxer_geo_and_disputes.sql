-- =====================================================================
-- FIXXER — MIGRAÇÃO CONSOLIDADA
-- Geolocalização em profiles + Disputa/Recurso de reembolso
-- Executar UMA vez no Supabase externo (via SQL Editor)
-- =====================================================================

BEGIN;

-- ---------------------------------------------------------------------
-- 1) PROFILES: campos de localização, ramo customizado e raio
-- ---------------------------------------------------------------------
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS custom_branch      text,
  ADD COLUMN IF NOT EXISTS latitude           double precision,
  ADD COLUMN IF NOT EXISTS longitude          double precision,
  ADD COLUMN IF NOT EXISTS service_radius_km  integer DEFAULT 25 CHECK (service_radius_km BETWEEN 1 AND 500);

-- Aliases opcionais para código legado que ainda usa lat/lng
-- (mantém compatibilidade sem quebrar dados existentes)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='profiles' AND column_name='lat'
  ) THEN
    EXECUTE 'ALTER TABLE public.profiles ADD COLUMN lat double precision GENERATED ALWAYS AS (latitude) STORED';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='profiles' AND column_name='lng'
  ) THEN
    EXECUTE 'ALTER TABLE public.profiles ADD COLUMN lng double precision GENERATED ALWAYS AS (longitude) STORED';
  END IF;
END$$;

-- Índice geográfico (agora usa colunas reais)
CREATE INDEX IF NOT EXISTS idx_profiles_geo
  ON public.profiles (latitude, longitude)
  WHERE latitude IS NOT NULL AND longitude IS NOT NULL;

-- Busca textual multi-ramo
CREATE INDEX IF NOT EXISTS idx_profiles_business_category_ts
  ON public.profiles
  USING gin (to_tsvector('portuguese', coalesce(business_category,'') || ' ' || coalesce(custom_branch,'')));

-- ---------------------------------------------------------------------
-- 2) APPOINTMENT_DISPUTES: contestação/recurso de reembolso
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.appointment_disputes (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id  uuid NOT NULL REFERENCES public.appointments(id) ON DELETE CASCADE,
  opened_by       uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reason          text NOT NULL CHECK (char_length(reason) BETWEEN 10 AND 2000),
  requested_action text NOT NULL DEFAULT 'refund_review'
                   CHECK (requested_action IN ('refund_review','partial_refund','full_refund','reverse_release')),
  evidence_urls   text[] DEFAULT '{}'::text[],
  status          text NOT NULL DEFAULT 'open'
                   CHECK (status IN ('open','under_review','approved','rejected','resolved')),
  admin_notes     text,
  resolved_at     timestamptz,
  resolved_by     uuid REFERENCES auth.users(id),
  refund_amount   numeric(12,2),
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_appointment_disputes_apt
  ON public.appointment_disputes(appointment_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_appointment_disputes_opened_by
  ON public.appointment_disputes(opened_by, status);

GRANT SELECT, INSERT, UPDATE ON public.appointment_disputes TO authenticated;
GRANT ALL ON public.appointment_disputes TO service_role;

ALTER TABLE public.appointment_disputes ENABLE ROW LEVEL SECURITY;

-- Ler: partes envolvidas no compromisso + admin
DROP POLICY IF EXISTS "disputes_select" ON public.appointment_disputes;
CREATE POLICY "disputes_select" ON public.appointment_disputes
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.appointments a
      WHERE a.id = appointment_id
        AND (a.proposer_id = auth.uid() OR a.invitee_id = auth.uid())
    )
    OR public.has_role(auth.uid(), 'admin')
  );

-- Abrir: apenas quem participou do compromisso
DROP POLICY IF EXISTS "disputes_insert" ON public.appointment_disputes;
CREATE POLICY "disputes_insert" ON public.appointment_disputes
  FOR INSERT TO authenticated
  WITH CHECK (
    opened_by = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.appointments a
      WHERE a.id = appointment_id
        AND (a.proposer_id = auth.uid() OR a.invitee_id = auth.uid())
    )
  );

-- Atualizar: dono da disputa pode editar enquanto 'open'; admin sempre
DROP POLICY IF EXISTS "disputes_update" ON public.appointment_disputes;
CREATE POLICY "disputes_update" ON public.appointment_disputes
  FOR UPDATE TO authenticated
  USING (
    (opened_by = auth.uid() AND status = 'open')
    OR public.has_role(auth.uid(), 'admin')
  )
  WITH CHECK (
    (opened_by = auth.uid() AND status = 'open')
    OR public.has_role(auth.uid(), 'admin')
  );

-- Trigger updated_at
CREATE OR REPLACE FUNCTION public.tg_touch_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at := now(); RETURN NEW; END;
$$;

DROP TRIGGER IF EXISTS trg_disputes_touch ON public.appointment_disputes;
CREATE TRIGGER trg_disputes_touch
  BEFORE UPDATE ON public.appointment_disputes
  FOR EACH ROW EXECUTE FUNCTION public.tg_touch_updated_at();

-- Registrar evento na timeline quando disputa muda de status
CREATE OR REPLACE FUNCTION public.tg_dispute_to_events()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.appointment_events(appointment_id, actor_id, event_type, metadata)
    VALUES (NEW.appointment_id, NEW.opened_by, 'dispute_opened',
            jsonb_build_object('dispute_id', NEW.id, 'requested_action', NEW.requested_action));
  ELSIF TG_OP = 'UPDATE' AND NEW.status IS DISTINCT FROM OLD.status THEN
    INSERT INTO public.appointment_events(appointment_id, actor_id, event_type, metadata)
    VALUES (NEW.appointment_id, NEW.resolved_by, 'dispute_' || NEW.status,
            jsonb_build_object('dispute_id', NEW.id, 'refund_amount', NEW.refund_amount));
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_dispute_to_events ON public.appointment_disputes;
CREATE TRIGGER trg_dispute_to_events
  AFTER INSERT OR UPDATE ON public.appointment_disputes
  FOR EACH ROW EXECUTE FUNCTION public.tg_dispute_to_events();

-- ---------------------------------------------------------------------
-- 3) Índice de eventos para timeline (se ainda não existir)
-- ---------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_appointment_events_apt_created
  ON public.appointment_events(appointment_id, created_at);

COMMIT;

-- =====================================================================
-- FIM
-- =====================================================================
