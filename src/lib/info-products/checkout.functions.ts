import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getCachedMonetization } from "@/lib/monetization";

export const createAsaasPayment = createServerFn({ method: "POST" })
  .validator((data: unknown) => z.object({
    productId: z.string().uuid(),
    userId: z.string().uuid(),
  }).parse(data))
  .handler(async ({ data }) => {
    // Por enquanto, como solicitado, deixamos pronto para as chaves
    // mas sem disparar a chamada real se não houver config
    const config = getCachedMonetization();
    
    if (!config.asaasApiKey) {
      throw new Error("Configuração ASAAS ausente no Admin.");
    }

    console.log("[Checkout] Simulando criação de cobrança ASAAS para:", data.productId);
    
    // Aqui viria a chamada: 
    // fetch('https://sandbox.asaas.com/api/v3/payments', ...)

    return {
      success: true,
      paymentId: "pay_mock_" + Math.random().toString(36).substring(7),
      pixQrCode: "BASE64_MOCK",
      pixCopyPaste: "00020126360014BR.GOV.BCB.PIX0114+55...",
      value: 99.90 // Valor real viria do produto
    };
  });
