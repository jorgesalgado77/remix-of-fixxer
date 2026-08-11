-- TABELA DE MÉTRICAS E ALERTAS
CREATE TABLE IF NOT EXISTS public.system_health_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    metric_type TEXT NOT NULL, -- 'rls_violation', 'workflow_error', 'financial_idempotency_hit', 'chat_bypass_attempt'
    severity TEXT DEFAULT 'warning',
    details JSONB,
    created_at TIMESTAMPTZ DEFAULT now()
);

GRANT SELECT, INSERT ON public.system_health_metrics TO authenticated;
GRANT ALL ON public.system_health_metrics TO service_role;

-- Função para registrar alertas via RPC
CREATE OR REPLACE FUNCTION public.log_security_alert(_type TEXT, _details JSONB, _severity TEXT DEFAULT 'warning')
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
    INSERT INTO public.system_health_metrics (metric_type, details, severity)
    VALUES (_type, _details, _severity);
END;
$$;

-- Reforço da Máquina de Estados com Bloqueio de Dupla Aceitação
CREATE OR REPLACE FUNCTION public.accept_proposal(
    _proposal_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_os_id UUID;
    v_prestador_id UUID;
    v_owner_id UUID;
    v_value NUMERIC;
    v_os_status TEXT;
BEGIN
    -- 1. Obter dados da proposta e OS com trava de escrita
    SELECT p.os_id, p.prestador_id, p.value, os.owner_id, os.status
    INTO v_os_id, v_prestador_id, v_value, v_owner_id, v_os_status
    FROM public.proposals p
    JOIN public.service_orders os ON os.id = p.os_id
    WHERE p.id = _proposal_id
    FOR UPDATE OF os;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('ok', false, 'error', 'Proposta ou O.S. não encontrada');
    END IF;

    -- BLOQUEIO DE DUPLA ACEITAÇÃO / ESTADO INVÁLIDO
    IF v_os_status <> 'RECEBENDO_PROPOSTAS' THEN
        PERFORM public.log_security_alert('workflow_error', jsonb_build_object('os_id', v_os_id, 'attempt', 'double_accept', 'current_status', v_os_status));
        RETURN jsonb_build_object('ok', false, 'error', 'Esta O.S. não está mais aceitando propostas (Status: ' || v_os_status || ')');
    END IF;

    -- 2. Validar se quem aceita é o dono
    IF auth.uid() <> v_owner_id AND NOT public.has_role(auth.uid(), 'admin') THEN
        RETURN jsonb_build_object('ok', false, 'error', 'Apenas o proprietário pode aceitar propostas');
    END IF;

    -- 3. Marcar proposta como aceita e as outras como recusadas
    UPDATE public.proposals SET status = 'recusada' WHERE os_id = v_os_id AND id <> _proposal_id;
    UPDATE public.proposals SET status = 'aceita' WHERE id = _proposal_id;

    -- 4. Atualizar OS
    UPDATE public.service_orders
    SET current_professional_id = v_prestador_id,
        price = v_value,
        status = 'PRESTADOR_SELECIONADO',
        updated_at = NOW()
    WHERE id = v_os_id;

    -- 5. Log
    INSERT INTO public.os_status_logs (os_id, to_status, actor_id, notes)
    VALUES (v_os_id, 'PRESTADOR_SELECIONADO', auth.uid(), 'Proposta aceita');

    RETURN jsonb_build_object('ok', true, 'os_id', v_os_id, 'prestador_id', v_prestador_id);
END;
$$;
