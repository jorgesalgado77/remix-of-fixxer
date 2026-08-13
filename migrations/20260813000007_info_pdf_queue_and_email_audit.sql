-- Fila de geração de PDFs de certificados
CREATE TABLE public.info_certificate_pdf_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    certificate_id UUID REFERENCES public.info_certificates(id) ON DELETE CASCADE NOT NULL,
    creator_id UUID NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
    attempts INTEGER NOT NULL DEFAULT 0,
    max_attempts INTEGER NOT NULL DEFAULT 3,
    error_log TEXT,
    pdf_url TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    started_at TIMESTAMPTZ,
    finished_at TIMESTAMPTZ
);

-- Log de auditoria detalhado para notificações/reenvios de certificados
CREATE TABLE public.info_certificate_email_audit (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    certificate_id UUID REFERENCES public.info_certificates(id) ON DELETE CASCADE NOT NULL,
    user_id UUID NOT NULL,
    recipient_email TEXT NOT NULL,
    notification_type TEXT NOT NULL DEFAULT 'initial' CHECK (notification_type IN ('initial', 'resend', 'manual')),
    status TEXT NOT NULL DEFAULT 'sent',
    unique_hash TEXT NOT NULL, -- Para deduplicação (hash de certificate_id + data formatada)
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Index para deduplicação e busca rápida
CREATE UNIQUE INDEX idx_cert_email_audit_dedup ON public.info_certificate_email_audit (unique_hash);
CREATE INDEX idx_cert_pdf_queue_status ON public.info_certificate_pdf_queue (status);

-- Grants
GRANT SELECT, INSERT, UPDATE ON public.info_certificate_pdf_queue TO authenticated;
GRANT ALL ON public.info_certificate_pdf_queue TO service_role;

GRANT SELECT, INSERT ON public.info_certificate_email_audit TO authenticated;
GRANT ALL ON public.info_certificate_email_audit TO service_role;

-- RLS
ALTER TABLE public.info_certificate_pdf_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.info_certificate_email_audit ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Creators can see their own PDF queue"
ON public.info_certificate_pdf_queue FOR SELECT
TO authenticated
USING (creator_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can see their own certificate audits"
ON public.info_certificate_email_audit FOR SELECT
TO authenticated
USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
