-- FIXXER: Máquina de Estados e Motor de Workflow Operacional
-- Implementa transições validadas, logs e integridade de O.S. (service_orders)

-- 1. EXTENSÕES E DEPENDÊNCIAS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. TABELA DE LOGS DE TRANSIÇÃO
CREATE TABLE IF NOT EXISTS public.os_status_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    os_id UUID REFERENCES public.service_orders(id) ON DELETE CASCADE,
    from_status TEXT,
    to_status TEXT NOT NULL,
    actor_id UUID REFERENCES public.profiles(id),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

GRANT SELECT ON public.os_status_logs TO authenticated;
GRANT ALL ON public.os_status_logs TO service_role;
ALTER TABLE public.os_status_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Participants View Logs" ON public.os_status_logs
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.service_orders os
            WHERE os.id = os_id
            AND (auth.uid() = os.owner_id OR auth.uid() = os.lojista_id OR auth.uid() = os.current_professional_id)
        )
        OR public.has_role(auth.uid(), 'admin')
    );

-- 3. RPC: TRANSITION_OS_STATUS
-- Valida a transição e registra no log de forma atômica.
CREATE OR REPLACE FUNCTION public.transition_os_status(
    _os_id UUID,
    _new_status TEXT,
    _notes TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_old_status TEXT;
    v_owner_id UUID;
    v_professional_id UUID;
    v_actor_id UUID := auth.uid();
    v_is_admin BOOLEAN;
BEGIN
    -- 1. Capturar estado atual
    SELECT status, owner_id, current_professional_id 
    INTO v_old_status, v_owner_id, v_professional_id
    FROM public.service_orders
    WHERE id = _os_id;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('ok', false, 'error', 'O.S. não encontrada');
    END IF;

    -- 2. Validar permissão (Apenas dono, prestador vinculado ou admin)
    v_is_admin := public.has_role(v_actor_id, 'admin');
    IF NOT (v_is_admin OR v_actor_id = v_owner_id OR v_actor_id = v_professional_id) THEN
        RETURN jsonb_build_object('ok', false, 'error', 'Permissão negada para transição');
    END IF;

    -- 3. Regras de Máquina de Estados (Simplificadas para esta etapa)
    -- TODO: Adicionar matriz rigorosa de transição permitida aqui

    -- 4. Executar transição
    UPDATE public.service_orders
    SET status = _new_status,
        updated_at = NOW()
    WHERE id = _os_id;

    -- 5. Registrar log
    INSERT INTO public.os_status_logs (os_id, from_status, to_status, actor_id, notes)
    VALUES (_os_id, v_old_status, _new_status, v_actor_id, _notes);

    RETURN jsonb_build_object('ok', true, 'from', v_old_status, 'to', _new_status);
END;
$$;

-- 4. RPC: ACCEPT_PROPOSAL
-- Aceita uma proposta, vincula o prestador e move a OS para PRESTADOR_SELECIONADO
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
BEGIN
    -- 1. Obter dados da proposta e OS
    SELECT p.os_id, p.prestador_id, p.value, os.owner_id
    INTO v_os_id, v_prestador_id, v_value, v_owner_id
    FROM public.proposals p
    JOIN public.service_orders os ON os.id = p.os_id
    WHERE p.id = _proposal_id;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('ok', false, 'error', 'Proposta ou O.S. não encontrada');
    END IF;

    -- 2. Validar se quem aceita é o dono
    IF auth.uid() <> v_owner_id AND NOT public.has_role(auth.uid(), 'admin') THEN
        RETURN jsonb_build_object('ok', false, 'error', 'Apenas o proprietário pode aceitar propostas');
    END IF;

    -- 3. Marcar proposta como aceita e as outras da mesma OS como recusadas
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

GRANT EXECUTE ON FUNCTION public.transition_os_status TO authenticated;
GRANT EXECUTE ON FUNCTION public.accept_proposal TO authenticated;
