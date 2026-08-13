-- PROMPT 16: EDUCAÇÃO HARDENING, PREVIEW & ALERTAS
-- Este script expande a infraestrutura de certificados com alertas de segurança
-- e metadados para branding em tempo real.

-- 1. Tabela de Alertas de Segurança (Validação de Certificados)
CREATE TABLE IF NOT EXISTS public.info_security_alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type TEXT NOT NULL, -- 'validation_anomaly', 'brute_force_attempt', 'rate_limit_spike'
    severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    message TEXT NOT NULL,
    metadata JSONB,
    resolved BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Histórico de Notificações de Certificados (Prevenção de Duplicidade)
CREATE TABLE IF NOT EXISTS public.info_certificate_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    certificate_id UUID NOT NULL REFERENCES public.info_certificates(id) ON DELETE CASCADE,
    sent_at TIMESTAMPTZ DEFAULT now(),
    recipient_email TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('sent', 'failed', 'bounced')),
    metadata JSONB
);

-- 3. Grants
GRANT SELECT, INSERT, UPDATE ON public.info_security_alerts TO authenticated;
GRANT ALL ON public.info_security_alerts TO service_role;
GRANT SELECT, INSERT ON public.info_certificate_notifications TO authenticated;
GRANT ALL ON public.info_certificate_notifications TO service_role;

-- 4. RLS
ALTER TABLE public.info_security_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.info_certificate_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view security alerts"
ON public.info_security_alerts FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Creators can see notifications for their certificates"
ON public.info_certificate_notifications FOR SELECT TO authenticated
USING (EXISTS (
    SELECT 1 FROM public.info_certificates c
    WHERE c.id = certificate_id AND c.creator_id = auth.uid()
));

-- 5. Função de Monitoramento de Anomalias (Auto-Trigger)
CREATE OR REPLACE FUNCTION public.check_validation_anomalies()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    _fail_count INTEGER;
BEGIN
    -- Conta falhas nos últimos 5 minutos
    SELECT count(*) INTO _fail_count
    FROM public.info_certificate_validation_metrics
    WHERE status != 'success'
      AND created_at > now() - interval '5 minutes';

    IF _fail_count > 50 THEN
        INSERT INTO public.info_security_alerts (type, severity, message, metadata)
        VALUES ('validation_anomaly', 'high', 'Pico de falhas na validação pública detectado', jsonb_build_object('fail_count', _fail_count));
    END IF;
END;
$$;
