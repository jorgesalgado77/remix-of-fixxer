import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getCachedMonetization } from "@/lib/monetization";
import { supabaseExternal } from "@/lib/supabaseExternal";
import { validateCouponForCheckout } from "./v2-monetization.ts";

export const createAsaasPayment = createServerFn({ method: "POST" })
  .validator((data: unknown) => z.object({
    productId: z.string().uuid(),
    userId: z.string().uuid(),
    offerId: z.string().uuid().optional(),
    couponCode: z.string().optional(),
  }).parse(data))
  .handler(async ({ data }) => {
    const config = getCachedMonetization();
    
    if (!config.asaasApiKey) {
      throw new Error("Configuração ASAAS ausente no Admin.");
    }

    // 1. Buscar o produto para obter o preço base
    const { data: product, error: prodErr } = await supabaseExternal
      .from('info_products')
      .select('price, title')
      .eq('id', data.productId)
      .single();

    if (prodErr || !product) throw new Error("Produto não encontrado");

    let finalAmount = product.price;
    let discountAmount = 0;
    let couponId = null;
    let usedOfferId = null;

    // 1.5 Validação de Oferta (Prompt 23)
    if (data.offerId) {
      const { data: offerRes, error: offerErr } = await supabaseExternal
        .rpc('validate_and_apply_info_offer', {
          _offer_id: data.offerId,
          _product_id: data.productId
        });

      if (offerErr) throw new Error("Erro ao validar oferta");
      
      const res = offerRes?.[0];
      if (!res?.success) {
        throw new Error(res?.error_message || "Oferta inválida");
      }

      finalAmount = res.final_price;
      usedOfferId = data.offerId;
    }


    // 2. Validar Cupom se fornecido (Prompt 19 - Centralized Validation)
    if (data.couponCode) {
      const validation = await validateCouponForCheckout({
        code: data.couponCode,
        productId: data.productId,
        userId: data.userId,
        amountGross: product.price
      });

      if (!validation.success) {
        throw new Error(validation.error || "Cupom inválido");
      }

      finalAmount = validation.final_amount!;
      discountAmount = validation.discount_amount!;
      couponId = validation.coupon_id!;
    }

    console.log(`[Checkout] Criando cobrança ASAAS: R$ ${finalAmount} (Desconto: R$ ${discountAmount})`);
    
    // Simulação da chamada ASAAS com metadados robustos para o Webhook
    // O prefixo 'pay_mock_' é mantido até a ativação da chave real de produção no Admin Master.
    return {
      success: true,
      paymentId: "pay_mock_" + Math.random().toString(36).substring(7),
      pixQrCode: "BASE64_MOCK",
      pixCopyPaste: "00020126360014BR.GOV.BCB.PIX0114+55...",
      value: finalAmount,
      discount: discountAmount,
      couponCode: data.couponCode
    };
  });

