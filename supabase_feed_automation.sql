-- Trigger para fechar demanda automaticamente ao aceitar proposta
CREATE OR REPLACE FUNCTION public.handle_proposal_acceptance()
RETURNS TRIGGER AS $$
BEGIN
  -- Se o status mudou para 'Aceita'
  IF (TG_OP = 'UPDATE' AND NEW.status = 'Aceita' AND OLD.status != 'Aceita') THEN
    -- Atualiza o post relacionado para 'Em_Execucao' e marca como não mais aceitando respostas
    UPDATE public.feed_posts
    SET status = 'Em_Execucao'
    WHERE id = NEW.post_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_proposal_accepted ON public.proposals;
CREATE TRIGGER on_proposal_accepted
  AFTER UPDATE ON public.proposals
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_proposal_acceptance();

-- Grant para garantir que o trigger funcione com permissões do sistema
GRANT UPDATE ON public.feed_posts TO authenticated;
GRANT UPDATE ON public.feed_posts TO service_role;
