# Auditoria de Comunicação: Notificações, Chat e Bloqueios (Prompt 08)

Este documento estabelece as diretrizes para consolidar o núcleo de comunicação do FIXXER, garantindo segurança, privacidade e integridade contra abusos.

## 1. Notificações Canônicas
O sistema deve migrar para a tabela única `notifications` com os seguintes campos:
- `id` (uuid)
- `owner_id` (uuid, FK profiles.id) - Quem recebe.
- `sender_id` (uuid, FK profiles.id, opcional) - Quem gerou.
- `type` (enum: info, success, warning, danger, chat, system)
- `title` / `content` (text)
- `link` (text, opcional)
- `read_at` (timestamptz)
- `metadata` (jsonb)

**Regra de Ouro:** O frontend NUNCA deve inserir notificações diretamente em nome do sistema. Use as RPCs de transição de status ou triggers de banco.

## 2. Motor de Chat e Presença
O chat deve operar sob o regime de **Participantes Validados**:
- **Visibilidade:** RLS deve garantir que `auth.uid() IN (sender_id, receiver_id)`.
- **Bloqueio Real:** 
  ```sql
  -- Exemplo de restrição de inserção em messages
  CREATE POLICY "No messages to blockers" ON public.messages
  FOR INSERT TO authenticated
  WITH CHECK (
    NOT EXISTS (
      SELECT 1 FROM public.user_blocks 
      WHERE blocker_id = receiver_id AND blocked_id = auth.uid()
    )
  );
  ```
- **Anti-Spam:** Implementar `rate_limiting` para envio de mensagens, especialmente para novos perfis.

## 3. Segurança de Dados Sensíveis (PIX/Contatos)
- **Contact-Guard:** Bloquear a exibição ou persistência de dados de contato (WhatsApp/Email) antes da aceitação formal de um orçamento/serviço, protegendo a taxa da plataforma.
- **RPC de Liberação:** Dados sensíveis de contato só devem ser revelados pelo backend após o status da O.S. mudar para `EM_EXECUCAO`.

## 4. Checklist de Auditoria
- [ ] O usuário A bloqueou B. B consegue enviar mensagem via API direta? (Deve falhar)
- [ ] O usuário A consegue ler notificações destinadas ao usuário B? (Deve falhar)
- [ ] O filtro de "WhatsApp" detecta variações como "9-9-9-9-9-9"?
- [ ] O Realtime para de entregar mensagens assim que o bloqueio é persistido?
