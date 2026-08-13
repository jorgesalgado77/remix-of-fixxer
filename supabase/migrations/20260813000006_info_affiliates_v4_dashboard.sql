-- 1. Tabela de Logs de Webhook para Idempotência e Reprocessamento
CREATE TABLE public.info_webhook_logs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    provider text NOT NULL, -- 'asaas', 'stripe', etc
    external_id text NOT NULL,
    payload jsonb NOT NULL,
    status text NOT NULL DEFAULT 'pending', -- 'pending', 'processed', 'failed'
    error_message text,
    retry_count integer DEFAULT 0,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    UNIQUE(provider, external_id)
);

GRANT SELECT, INSERT, UPDATE ON public.info_webhook_logs TO authenticated;
GRANT ALL ON public.info_webhook_logs TO service_role;

-- 2. Tabela de Fila de Revisão Anti-Fraude
CREATE TABLE public.info_fraud_queue (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    event_type text NOT NULL, -- 'sale', 'click', 'lead'
    source_id uuid NOT NULL, -- ID na tabela de origem (ex: info_affiliate_sales)
    reason text NOT NULL,
    severity text NOT NULL DEFAULT 'medium',
    status text NOT NULL DEFAULT 'pending', -- 'pending', 'approved', 'rejected', 'revoked'
    reviewer_id uuid REFERENCES auth.users(id),
    metadata jsonb DEFAULT '{}',
    created_at timestamptz DEFAULT now(),
    resolved_at timestamptz
);

GRANT SELECT, INSERT, UPDATE ON public.info_fraud_queue TO authenticated;
GRANT ALL ON public.info_fraud_queue TO service_role;

-- 3. Habilitar RLS
ALTER TABLE public.info_webhook_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.info_fraud_queue ENABLE ROW LEVEL SECURITY;

-- 4. Políticas (Simplificadas para o contexto Admin/Creator)
CREATE POLICY "Admins can manage webhook logs" ON public.info_webhook_logs
    TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage fraud queue" ON public.info_fraud_queue
    TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- 5. Função de Reprocessamento (Simulada para a lógica do Webhook)
CREATE OR REPLACE FUNCTION public.reprocess_failed_webhooks()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    reprocessed_count integer := 0;
BEGIN
    -- Lógica seria integrada ao handler do Edge Function/Server Function
    UPDATE public.info_webhook_logs
    SET status = 'pending', retry_count = retry_count + 1
    WHERE status = 'failed' AND retry_count < 5;
    
    GET DIAGNOSTICS reprocessed_count = ROW_COUNT;
    RETURN reprocessed_count;
END;
$$;
