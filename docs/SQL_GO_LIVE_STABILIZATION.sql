-- FIXXER GO-LIVE GATE: Estabilização de Workflow, Segurança e Financeiro
-- OBJETIVO: Garantir que a máquina de estados, RLS e RPCs estejam rigorosamente conforme os requisitos de produção.

-- 1. MÁQUINA DE ESTADOS RIGOROSA (Matriz de Transição)
-- Refina a transição para impedir saltos de estado inválidos.
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
    v_allowed BOOLEAN := FALSE;
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

    -- 3. Matriz de Transição Rigorosa
    IF v_old_status = _new_status THEN
        RETURN jsonb_build_object('ok', true, 'message', 'Estado já atualizado', 'to', _new_status);
    END IF;

    CASE v_old_status
        WHEN 'CRIADA' THEN v_allowed := (_new_status IN ('PUBLICADA', 'CANCELADA'));
        WHEN 'PUBLICADA' THEN v_allowed := (_new_status IN ('RECEBENDO_PROPOSTAS', 'CANCELADA', 'EXPIRADA'));
        WHEN 'RECEBENDO_PROPOSTAS' THEN v_allowed := (_new_status IN ('PRESTADOR_SELECIONADO', 'CANCELADA', 'EXPIRADA'));
        WHEN 'PRESTADOR_SELECIONADO' THEN v_allowed := (_new_status IN ('PAGAMENTO_EM_CUSTODIA', 'CANCELADA'));
        WHEN 'PAGAMENTO_EM_CUSTODIA' THEN v_allowed := (_new_status IN ('AGENDADA', 'CANCELADA', 'EM_DISPUTA'));
        WHEN 'AGENDADA' THEN v_allowed := (_new_status IN ('CHECKIN', 'CANCELADA', 'EM_DISPUTA'));
        WHEN 'CHECKIN' THEN v_allowed := (_new_status IN ('EM_EXECUCAO', 'EM_DISPUTA'));
        WHEN 'EM_EXECUCAO' THEN v_allowed := (_new_status IN ('CHECKOUT', 'EM_DISPUTA'));
        WHEN 'CHECKOUT' THEN v_allowed := (_new_status IN ('AGUARDANDO_CONFIRMACAO', 'EM_DISPUTA'));
        WHEN 'AGUARDANDO_CONFIRMACAO' THEN v_allowed := (_new_status IN ('CONCLUIDA', 'EM_DISPUTA'));
        WHEN 'CONCLUIDA' THEN v_allowed := (_new_status IN ('ESCROW_LIBERADO', 'EM_DISPUTA'));
        WHEN 'ESCROW_LIBERADO' THEN v_allowed := (_new_status IN ('AVALIACAO_PENDENTE'));
        WHEN 'AVALIACAO_PENDENTE' THEN v_allowed := (_new_status IN ('FINALIZADA'));
        WHEN 'CANCELADA' THEN v_allowed := FALSE;
        WHEN 'FINALIZADA' THEN v_allowed := FALSE;
        WHEN 'EM_DISPUTA' THEN v_allowed := (_new_status IN ('REEMBOLSADA', 'ESCROW_LIBERADO'));
        ELSE v_allowed := v_is_admin; -- Admin pode forçar em casos excepcionais se não listado
    END CASE;

    IF NOT v_allowed AND NOT v_is_admin THEN
        RETURN jsonb_build_object('ok', false, 'error', 'Transição de estado não permitida: ' || v_old_status || ' -> ' || _new_status);
    END IF;

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

-- 2. SEGURANÇA STORAGE (POLICIES)
-- Garante que apenas o dono do documento ou admin acesse os buckets privados.

-- Bucket: documents-private
DO $$
BEGIN
    INSERT INTO storage.buckets (id, name, public) 
    VALUES ('documents-private', 'documents-private', false)
    ON CONFLICT (id) DO UPDATE SET public = false;
END $$;

DROP POLICY IF EXISTS "Users can view own documents" ON storage.objects;
CREATE POLICY "Users can view own documents" ON storage.objects
    FOR SELECT TO authenticated
    USING (
        bucket_id = 'documents-private' 
        AND ( (storage.foldername(name))[1] = auth.uid()::text OR public.has_role(auth.uid(), 'admin') )
    );

DROP POLICY IF EXISTS "Users can upload own documents" ON storage.objects;
CREATE POLICY "Users can upload own documents" ON storage.objects
    FOR INSERT TO authenticated
    WITH CHECK (
        bucket_id = 'documents-private' 
        AND ( (storage.foldername(name))[1] = auth.uid()::text )
    );

DROP POLICY IF EXISTS "Users can delete own documents" ON storage.objects;
CREATE POLICY "Users can delete own documents" ON storage.objects
    FOR DELETE TO authenticated
    USING (
        bucket_id = 'documents-private' 
        AND ( (storage.foldername(name))[1] = auth.uid()::text )
    );

-- 3. AUDITORIA RLS COMPLEMENTAR (Proteção Anti-Bypass Chat)
-- Garante que mensagens sejam enviadas apenas por quem tem UID válido e não está bloqueado.
-- (A lógica principal está no src/lib/chat-send.ts, mas o banco deve apoiar)

DROP POLICY IF EXISTS "Chat messages RLS protection" ON public.chat_messages;
CREATE POLICY "Chat messages RLS protection" ON public.chat_messages
    FOR INSERT TO authenticated
    WITH CHECK (
        auth.uid() = sender_id 
        AND NOT EXISTS (
            SELECT 1 FROM public.user_blocks 
            WHERE (blocker_id = auth.uid() AND blocked_id = receiver_id)
            OR (blocker_id = receiver_id AND blocked_id = auth.uid())
        )
    );

-- 4. FINANCEIRO: TRAVA DE CONCORRÊNCIA EM COINS
-- Adiciona trava pessimista na leitura do saldo
CREATE OR REPLACE FUNCTION public.consume_coins_safe(
    _user_id uuid,
    _amount integer,
    _source text,
    _description text,
    _idempotency_key text,
    _reference_id text DEFAULT NULL
)
RETURNS TABLE (success boolean, new_balance integer, error_msg text) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_current_balance integer;
BEGIN
    -- Idempotência
    IF EXISTS (SELECT 1 FROM public.coin_transactions WHERE idempotency_key = _idempotency_key) THEN
        SELECT balance INTO v_current_balance FROM public.user_coins WHERE user_id = _user_id;
        RETURN QUERY SELECT true, v_current_balance, NULL::text;
        RETURN;
    END IF;

    -- Trava pessimista no saldo
    SELECT balance INTO v_current_balance 
    FROM public.user_coins 
    WHERE user_id = _user_id 
    FOR UPDATE;

    IF v_current_balance IS NULL OR v_current_balance < _amount THEN
        RETURN QUERY SELECT false, COALESCE(v_current_balance, 0), 'Saldo insuficiente'::text;
        RETURN;
    END IF;

    UPDATE public.user_coins
    SET balance = balance - _amount,
        updated_at = now()
    WHERE user_id = _user_id
    RETURNING balance INTO v_current_balance;

    INSERT INTO public.coin_transactions (user_id, type, amount, source, description, idempotency_key, reference_id, balance_after)
    VALUES (_user_id, 'debit', _amount, _source, _description, _idempotency_key, _reference_id, v_current_balance);

    RETURN QUERY SELECT true, v_current_balance, NULL::text;
END;
$$;

GRANT ALL ON public.coin_transactions TO authenticated;
GRANT ALL ON public.os_status_logs TO authenticated;
