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
            // 1. Verificar metadados e produto
            const productId = payment.externalReference;
            const userId = body.payment.metadata?.userId;
            const trackingCode = body.payment.metadata?.affiliateTrackingCode;
            const couponCode = body.payment.metadata?.couponCode;

            if (!productId || !userId) {
              console.error('[AsaasWebhook] Metadados incompletos (productId/userId ausentes)');
              return new Response('Missing Metadata', { status: 400 });
            }

            // 2. Buscar Produto para obter o Criador
            const { data: product } = await supabaseExternal
              .from('info_products')
              .select('creator_id, price')
              .eq('id', productId)
              .single();

            if (!product) throw new Error('Produto não encontrado');

            // 3. Reconciliação Financeira via RPC (Centralizada)
            const { data: split, error: splitErr } = await supabaseExternal.rpc('calculate_sale_split', {
              _amount_gross: payment.value,
              _amount_discount: payment.discountValue || 0,
              _creator_id: product.creator_id,
              _affiliate_percent: body.payment.metadata?.affiliatePercent || 0
            });

            if (splitErr) {
              console.error('[AsaasWebhook] Erro na reconciliação financeira:', splitErr);
              throw splitErr;
            }

            // 4. Registrar Venda Consolidada (Ledger)
            const { data: sale, error: saleError } = await supabaseExternal
              .from('info_sales')
              .upsert({
                external_id: payment.id,
                creator_id: product.creator_id,
                buyer_id: userId,
                product_id: productId,
                amount_gross: split.amount_gross,
                amount_discount: split.amount_discount,
                amount_net_paid: split.amount_net_paid,
                fee_platform_percent: split.fee_platform_percent,
                fee_platform_amount: split.fee_platform_amount,
                fee_affiliate_percent: split.fee_affiliate_percent,
                fee_affiliate_amount: split.fee_affiliate_amount,
                amount_creator_net: split.amount_creator_net,
                status: 'PAID',
                payment_method: payment.billingType,
                coupon_code: couponCode,
                metadata: body,
                updated_at: new Date().toISOString()
              }, { onConflict: 'external_id' })
              .select()
              .single();

            if (saleError) throw saleError;

            // 5. Liberar Entitlement
            const { error: entError } = await supabaseExternal.from('info_product_entitlements').upsert({
              user_id: userId,
              product_id: productId,
              purchase_id: sale.id,
              status: 'active',
              granted_at: new Date().toISOString()
            }, { onConflict: 'user_id,product_id' });
            
            if (entError) {
              console.error(`[AsaasWebhook] Falha ao liberar entitlement:`, entError);
            }

            // 6. Atribuição de Afiliado (Se houver tracking code)
            if (trackingCode) {
              const { data: affResult, error: affErr } = await supabaseExternal.rpc('process_affiliate_sale_v2', {
                _sale_id: sale.id,
                _product_id: productId,
                _buyer_id: userId,
                _tracking_code: trackingCode,
                _amount_total: payment.value
              });

              if (affErr) {
                console.error(`[AsaasWebhook] Falha na atribuição de afiliado:`, affErr);
              }
            }
          } else if (newStatus === 'REFUNDED') {
            // Tratar estorno/refund
            await supabaseExternal
              .from('info_sales')
              .update({ status: 'REFUNDED', updated_at: new Date().toISOString() })
              .eq('external_id', payment.id);
            
            // Revogar entitlement (opcional, dependendo da política de negócio do criador)
            // Aqui marcamos como inativo por segurança
            const userId = body.payment.metadata?.userId;
            const productId = payment.externalReference;
            if (userId && productId) {
              await supabaseExternal
                .from('info_product_entitlements')
                .update({ status: 'inactive' })
                .eq('user_id', userId)
                .eq('product_id', productId);
            }
          } else {
            // Apenas atualiza status para outros eventos
            await supabaseExternal
              .from('info_sales')
              .update({ status: newStatus, metadata: body, updated_at: new Date().toISOString() })
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
