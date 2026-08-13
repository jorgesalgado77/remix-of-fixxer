import { createFileRoute } from '@tanstack/react-router';
import { z } from 'zod';
import { supabaseExternal } from '@/lib/supabaseExternal';
import { getCachedMonetization } from '@/lib/monetization';

export const Route = createFileRoute('/api/public/asaas')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const config = getCachedMonetization();
          const signature = request.headers.get('asaas-access-token');

          // Validação de segurança básica via token (conforme solicitado no prompt)
          if (config.asaasWebhookSecret && signature !== config.asaasWebhookSecret) {
            console.error('[AsaasWebhook] Assinatura inválida');
            return new Response('Unauthorized', { status: 401 });
          }

          const body = await request.json();
          const { event, payment } = body;

          console.log(`[AsaasWebhook] Evento recebido: ${event}`, payment.id);

          // IDEMPOTÊNCIA: Verificar se a transação já foi processada
          const { data: existingTx } = await supabaseExternal
            .from('financial_transactions')
            .select('status, id')
            .eq('external_id', payment.id)
            .maybeSingle();

          if (existingTx && existingTx.status === 'PAID') {
            console.log('[AsaasWebhook] Transação já processada (PAID). Ignorando.');
            return new Response('OK');
          }

          // Mapear status ASAAS para nosso Ledger
          const statusMap: Record<string, string> = {
            'PAYMENT_CONFIRMED': 'PAID',
            'PAYMENT_RECEIVED': 'PAID',
            'PAYMENT_OVERDUE': 'EXPIRED',
            'PAYMENT_DELETED': 'CANCELLED',
            'PAYMENT_REFUNDED': 'REFUNDED',
          };

          const newStatus = statusMap[event] || 'PENDING';

          if (newStatus === 'PAID') {
            // 1. Atualizar ou Criar Transação
            const { data: tx, error: txError } = await supabaseExternal
              .from('financial_transactions')
              .upsert({
                external_id: payment.id,
                amount: payment.value,
                net_amount: payment.netValue,
                status: 'PAID',
                metadata: body,
                updated_at: new Date().toISOString()
              }, { onConflict: 'external_id' })
              .select()
              .single();

            if (txError) throw txError;

            // 2. Liberar Entitlement (Se for um Info Produto)
            const productId = payment.externalReference; // Assumimos que passamos o ID no externalReference
            if (productId && payment.customer) {
               // Buscar user_id vinculado ao customer ou metadata (a implementar no fluxo de criação)
               // Por enquanto, registramos o entitlement se tivermos o user_id
               const userId = body.payment.metadata?.userId; 
               
               if (userId) {
                 await supabaseExternal.from('info_product_entitlements').upsert({
                   user_id: userId,
                   product_id: productId,
                   transaction_id: tx.id,
                   status: 'active'
                 }, { onConflict: 'user_id,product_id' });
                 
                 console.log(`[AsaasWebhook] Entitlement liberado para ${userId} -> ${productId}`);
               }
            }
          } else {
            // Apenas atualiza status para outros eventos
            await supabaseExternal
              .from('financial_transactions')
              .update({ status: newStatus, metadata: body })
              .eq('external_id', payment.id);
          }

          return new Response('OK');
        } catch (error: any) {
          console.error('[AsaasWebhook] Erro:', error);
          return new Response(error.message, { status: 500 });
        }
      }
    }
  }
});
