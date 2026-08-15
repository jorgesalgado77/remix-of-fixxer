import { describe, it, expect } from 'vitest';
import { calculateSaleSplit } from '../lib/info-products/v2-monetization';

describe('Reconciliação Financeira de Vendas (Matemática Monetária)', () => {
  it('Deve calcular corretamente o split padrão (15% Fixxer) para R$ 100,00', async () => {
    // Simulando comportamento da RPC caso o Supabase falhe ou para teste unitário
    const result = await calculateSaleSplit({
      amountGross: 100,
      amountDiscount: 0,
      creatorId: '00000000-0000-0000-0000-000000000000'
    });

    expect(result.amount_net_paid).toBe(100);
    expect(result.fee_platform_amount).toBe(15);
    expect(result.amount_creator_net).toBe(85);
  });

  it('Deve calcular corretamente com desconto de R$ 20,00 em venda de R$ 100,00', async () => {
    const result = await calculateSaleSplit({
      amountGross: 100,
      amountDiscount: 20,
      creatorId: '00000000-0000-0000-0000-000000000000'
    });

    expect(result.amount_net_paid).toBe(80);
    // 15% de 80 = 12
    expect(result.fee_platform_amount).toBe(12);
    expect(result.amount_creator_net).toBe(68);
  });

  it('Deve validar arredondamento monetário para valores quebrados (R$ 50,00)', async () => {
    const result = await calculateSaleSplit({
      amountGross: 50,
      amountDiscount: 0,
      creatorId: '00000000-0000-0000-0000-000000000000'
    });

    // 15% de 50 = 7.50
    expect(result.fee_platform_amount).toBe(7.5);
    expect(result.amount_creator_net).toBe(42.5);
  });

  it('Deve calcular corretamente com comissão de afiliado (10%)', async () => {
    const result = await calculateSaleSplit({
      amountGross: 100,
      amountDiscount: 0,
      creatorId: '00000000-0000-0000-0000-000000000000',
      affiliatePercent: 10
    });

    expect(result.fee_platform_amount).toBe(15);
    expect(result.fee_affiliate_amount).toBe(10);
    expect(result.amount_creator_net).toBe(75);
  });

  it('Deve garantir que o total reconciliado seja igual ao valor pago', async () => {
    const amountGross = 1000;
    const amountDiscount = 150;
    const result = await calculateSaleSplit({
      amountGross,
      amountDiscount,
      creatorId: '00000000-0000-0000-0000-000000000000',
      affiliatePercent: 5
    });

    const totalCalculated = result.fee_platform_amount + result.fee_affiliate_amount + result.amount_creator_net;
    expect(totalCalculated).toBe(result.amount_net_paid);
  });
});
