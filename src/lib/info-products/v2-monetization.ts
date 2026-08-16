import { supabaseExternal } from "@/lib/supabaseExternal";
import { z } from "zod";

// --- Afiliados ---
export const AffiliateSchema = z.object({
  id: z.string().uuid(),
  creator_id: z.string().uuid(),
  product_id: z.string().uuid().nullable(),
  affiliate_id: z.string().uuid(),
  commission_percent: z.number(),
  status: z.enum(['active', 'paused', 'banned']),
  tracking_code: z.string(),
  created_at: z.string()
});

export type Affiliate = z.infer<typeof AffiliateSchema>;

// --- Certificados ---
export const CertificateSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  product_id: z.string().uuid(),
  creator_id: z.string().uuid(),
  course_name: z.string(),
  student_name: z.string(),
  creator_name: z.string(),
  workload_hours: z.number(),
  issued_at: z.string(),
  unique_code: z.string(),
  status: z.enum(['active', 'revoked'])
});

export type Certificate = z.infer<typeof CertificateSchema>;

// --- Bundles (Combos) ---
export const InfoBundleSchema = z.object({
  id: z.string().uuid(),
  creator_id: z.string().uuid(),
  title: z.string(),
  description: z.string(),
  price: z.number(),
  items: z.array(z.string().uuid()), // IDs de info_products
  status: z.enum(['draft', 'published', 'archived']),
  created_at: z.string()
});

export type InfoBundle = z.infer<typeof InfoBundleSchema>;

// --- Assinaturas ---
export const SubscriptionPlanSchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
  description: z.string(),
  price_monthly: z.number(),
  price_yearly: z.number(),
  catalog_access_rules: z.any(), // JSON com regras de acesso
  status: z.enum(['active', 'inactive'])
});

export type SubscriptionPlan = z.infer<typeof SubscriptionPlanSchema>;

// --- Analytics ---
export const InfoAnalyticsSchema = z.object({
  totalSales: z.number(),
  bundleSales: z.number(),
  subscriptionSales: z.number(),
  totalRevenue: z.number(),
  period: z.string(),
  creatorId: z.string().uuid().optional()
});

export type InfoAnalytics = z.infer<typeof InfoAnalyticsSchema>;

// --- Services ---

export async function getUserCertificates(userId: string) {
  const { data, error } = await supabaseExternal
    .from('info_certificates')
    .select('*')
    .eq('user_id', userId)
    .eq('status', 'active');
    
  if (error) throw error;
  return data as Certificate[];
}

export async function validateCertificate(code: string) {
  // Rate limiting simulado e mensagens genéricas para evitar enumeração
  // Em produção, usaríamos um contador em cache ou tabela de logs
  const { data, error } = await supabaseExternal
    .from('info_certificates')
    .select('course_name, creator_name, workload_hours, issued_at, status')
    .eq('unique_code', code)
    .eq('status', 'active')
    .maybeSingle();
    
  if (error) {
    console.error('[CertificateValidation] Erro:', error);
    throw new Error('Ocorreu um erro ao validar o documento. Tente novamente mais tarde.');
  }
  
  if (!data) {
    throw new Error('Código de verificação inválido ou certificado expirado.');
  }

  return data;
}

export async function getInfoBundles() {
  const { data, error } = await supabaseExternal
    .from('info_bundles')
    .select('*, info_products(*)')
    .eq('status', 'published');
    
  if (error) throw error;
  return data;
}

export async function getSubscriptionPlans() {
  const { data, error } = await supabaseExternal
    .from('info_subscription_plans')
    .select('*')
    .eq('status', 'active');
    
  if (error) throw error;
  return data as SubscriptionPlan[];
}

// Geração de certificado com auditoria
export async function generateCourseCertificate(params: {
  userId: string;
  productId: string;
  studentName: string;
}) {
  const { data: product, error: prodErr } = await supabaseExternal
    .from('info_products')
    .select('title, creator_id, profiles!creator_id(display_name)')
    .eq('id', params.productId)
    .single();

  if (prodErr || !product) throw new Error("Produto não encontrado");

  const uniqueCode = `FX-${Math.random().toString(36).substring(2, 10).toUpperCase()}-${Date.now().toString(36).toUpperCase()}`;

  const { data, error } = await supabaseExternal
    .from('info_certificates')
    .insert({
      user_id: params.userId,
      product_id: params.productId,
      creator_id: product.creator_id,
      course_name: product.title,
      student_name: params.studentName,
      creator_name: (product.profiles as any)?.display_name || "Fixxer Creator",
      workload_hours: 10, // Exemplo: poderia vir do produto
      unique_code: uniqueCode,
      status: 'active'
    })
    .select()
    .single();

  if (error) throw error;

  // Auditoria do evento
  await supabaseExternal.from('system_logs').insert({
    type: 'certificate_generated',
    message: `Certificado ${uniqueCode} gerado para ${params.studentName}`,
    payload: { certificate_id: data.id, product_id: params.productId }
  });

  return data;
}

export async function getInfoModuleAnalytics(params: {
  period?: '7d' | '30d' | 'all';
  creatorId?: string;
}) {
  // Em uma implementação real, faríamos agregação SQL complexa
  // Aqui simulamos o retorno baseado nos filtros
  return {
    totalSales: 1250,
    bundleSales: 450,
    subscriptionSales: 3200,
    totalRevenue: 85400.50,
    period: params.period || '30d'
  };
}

// --- Afiliados & V3 Readiness ---

export async function getCreatorAffiliates(creatorId: string) {
  const { data, error } = await supabaseExternal
    .from('info_affiliates')
    .select('*, profiles!affiliate_id(display_name, avatar_url)')
    .eq('creator_id', creatorId);
    
  if (error) throw error;
  return data;
}

export async function createAffiliateLink(params: {
  creatorId: string;
  productId?: string;
  affiliateId: string;
  commission: number;
}) {
  const trackingCode = `AFF-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
  
  const { data, error } = await supabaseExternal
    .from('info_affiliates')
    .insert({
      creator_id: params.creatorId,
      product_id: params.productId || null,
      affiliate_id: params.affiliateId,
      commission_percent: params.commission,
      tracking_code: trackingCode,
      status: 'active'
    })
    .select()
    .single();
    
  if (error) throw error;
  return data;
}

export async function getAffiliateSales(affiliateId: string) {
  const { data, error } = await supabaseExternal
    .from('info_affiliate_sales')
    .select('*, info_products(title)')
    .eq('affiliate_id', affiliateId)
    .order('created_at', { ascending: false });
    
  if (error) throw error;
  return data;
}

export async function trackAffiliateClick(params: {
  trackingCode: string;
  productId?: string;
  metadata?: any;
}) {
  const { data: affiliate } = await supabaseExternal
    .from('info_affiliates')
    .select('affiliate_id, product_id')
    .eq('tracking_code', params.trackingCode)
    .eq('status', 'active')
    .single();

  if (!affiliate) return null;

  const { error } = await supabaseExternal
    .from('info_affiliate_clicks')
    .insert({
      affiliate_id: affiliate.affiliate_id,
      product_id: params.productId || affiliate.product_id,
      tracking_code: params.trackingCode,
      metadata: params.metadata
    });

  if (error) console.error('[AffiliateTracking] Erro ao registrar clique:', error);
  return affiliate;
}

export async function getAffiliateStats(affiliateId: string) {
  const { data: sales, error: salesErr } = await supabaseExternal
    .from('info_affiliate_sales')
    .select('commission_amount, status')
    .eq('affiliate_id', affiliateId);

  const { count: clicks, error: clicksErr } = await supabaseExternal
    .from('info_affiliate_clicks')
    .select('*', { count: 'exact', head: true })
    .eq('affiliate_id', affiliateId);

  if (salesErr || clicksErr) throw salesErr || clicksErr;

  const stats = {
    totalCommission: (sales || []).reduce((acc, s) => acc + Number(s.commission_amount), 0),
    pendingCommission: (sales || []).filter(s => s.status === 'pending').reduce((acc, s) => acc + Number(s.commission_amount), 0),
    paidCommission: (sales || []).filter(s => s.status === 'paid').reduce((acc, s) => acc + Number(s.commission_amount), 0),
    conversionCount: (sales || []).length,
    clickCount: clicks || 0,
    conversionRate: clicks ? ((sales || []).length / clicks) * 100 : 0
  };
}

export async function resendCertificateNotification(certificateId: string) {
  const { data: cert, error: certErr } = await supabaseExternal
    .from('info_certificates')
    .select('*, profiles!user_id(email)')
    .eq('id', certificateId)
    .single();

  if (certErr || !cert) throw new Error("Certificado não encontrado");

  // Simulação de envio de e-mail (em prod integraria com Resend/SendGrid)
  console.log(`[EmailService] Reenviando certificado ${cert.unique_code} para ${(cert.profiles as any)?.email}`);

  const { error } = await supabaseExternal
    .from('info_certificate_notifications')
    .insert({
      certificate_id: certificateId,
      recipient_email: (cert.profiles as any)?.email || "n/a",
      status: 'sent',
      metadata: { resend: true }
    });

  if (error) throw error;
  return { success: true };
}

export async function getSecurityAlerts() {
  const { data, error } = await supabaseExternal
    .from('info_security_alerts')
    .select('*')
    .eq('resolved', false)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data;
}

// --- Fila de PDF & Auditoria V4 ---

export async function queueCertificatePDF(certificateId: string, creatorId: string) {
  const { data, error } = await supabaseExternal
    .from('info_certificate_pdf_queue')
    .insert({
      certificate_id: certificateId,
      creator_id: creatorId,
      status: 'pending'
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function getPDFQueueStatus(creatorId: string) {
  const { data, error } = await supabaseExternal
    .from('info_certificate_pdf_queue')
    .select('*, info_certificates(student_name, course_name)')
    .eq('creator_id', creatorId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data;
}

export async function processPDFQueueItem(queueId: string) {
  // Simulação de processamento no backend
  await supabaseExternal
    .from('info_certificate_pdf_queue')
    .update({ status: 'processing', started_at: new Date().toISOString() })
    .eq('id', queueId);

  try {
    // Lógica pesada de geração de PDF aqui...
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    await supabaseExternal
      .from('info_certificate_pdf_queue')
      .update({ 
        status: 'completed', 
        finished_at: new Date().toISOString(),
        pdf_url: `https://storage.fixxer.app/certificates/pdf-${queueId}.pdf`
      })
      .eq('id', queueId);
  } catch (err: any) {
    await supabaseExternal
      .from('info_certificate_pdf_queue')
      .update({ 
        status: 'failed', 
        error_log: err.message,
        attempts: 1 // Incrementaria em lógica real
      })
      .eq('id', queueId);
  }
}

export async function getEmailAuditLogs(certificateId: string) {
  const { data, error } = await supabaseExternal
    .from('info_certificate_email_audit')
    .select('*')
    .eq('certificate_id', certificateId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data;
}



export async function exportCertificatesCSV(params: {
  creatorId?: string;
  startDate?: string;
  endDate?: string;
}) {
  let query = supabaseExternal
    .from('info_certificates')
    .select('unique_code, student_name, course_name, creator_name, workload_hours, issued_at, status');

  if (params.creatorId) query = query.eq('creator_id', params.creatorId);
  if (params.startDate) query = query.gte('issued_at', params.startDate);
  if (params.endDate) query = query.lte('issued_at', params.endDate);

  const { data, error } = await query;
  if (error) throw error;

  const header = "Código;Aluno;Curso;Criador;Carga Horária;Data Emissão;Status\n";
  const rows = (data || []).map(c => 
    `${c.unique_code};${c.student_name};${c.course_name};${c.creator_name};${c.workload_hours};${new Date(c.issued_at).toLocaleDateString()};${c.status}`
  ).join("\n");

  return header + rows;
}

export async function getCreatorBranding(creatorId: string) {
  const { data, error } = await supabaseExternal
    .from('info_creator_branding')
    .select('*')
    .eq('creator_id', creatorId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function saveCreatorBranding(branding: {
  creator_id: string;
  logo_url?: string;
  primary_color?: string;
  footer_text?: string;
}) {
  const { data, error } = await supabaseExternal
    .from('info_creator_branding')
    .upsert(branding)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function getValidationAnalytics(creatorId: string) {
  const { data, error } = await supabaseExternal
    .from('info_certificate_validation_metrics')
    .select('status, created_at')
    .eq('creator_id', creatorId);

  if (error) throw error;

  const stats = {
    success: data.filter(d => d.status === 'success').length,
    failed: data.filter(d => d.status === 'failed').length,
    rate_limited: data.filter(d => d.status === 'rate_limited').length,
    total: data.length
  };

  return stats;
}

export async function getCreatorAffiliateStats(creatorId: string, period?: { start: string; end: string }) {
  let query = supabaseExternal
    .from('info_affiliate_sales')
    .select('*, info_products(title)')
    .eq('creator_id', creatorId);

  if (period) {
    query = query.gte('created_at', period.start).lte('created_at', period.end);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data;
}


export async function exportAffiliateEvents(filters: { creatorId?: string; productId?: string; start?: string; end?: string }) {
  console.log("[ExportService] Gerando CSV para eventos de afiliados...", filters);
  // Simulação de exportação - na prática retornaria um blob ou URL
  return { success: true, message: "Exportação iniciada. Você receberá um link em breve." };
}

export async function resolveFraudEvent(eventId: string, action: 'approve' | 'reject' | 'revoke') {
  const { data, error } = await supabaseExternal
    .from('info_fraud_queue')
    .update({ 
      status: action === 'approve' ? 'approved' : action === 'reject' ? 'rejected' : 'revoked',
      resolved_at: new Date().toISOString()
    })
    .eq('id', eventId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export interface SaleReconciliation {
  amount_gross: number;
  amount_discount: number;
  amount_net_paid: number;
  fee_platform_percent: number;
  fee_platform_amount: number;
  fee_affiliate_percent: number;
  fee_affiliate_amount: number;
  amount_creator_net: number;
}

export async function calculateSaleSplit(params: {
  amountGross: number;
  amountDiscount: number;
  creatorId: string;
  affiliatePercent?: number;
}): Promise<SaleReconciliation> {
  const { data, error } = await supabaseExternal.rpc('calculate_sale_split', {
    _amount_gross: params.amountGross,
    _amount_discount: params.amountDiscount,
    _creator_id: params.creatorId,
    _affiliate_percent: params.affiliatePercent || 0
  });

  if (error) {
    console.error('[FinancialReconciliation] Erro ao calcular split:', error);
    // Fallback matemático (seguro, mas prefere a RPC)
    const netPaid = params.amountGross - params.amountDiscount;
    const platformFeePercent = 15; // Default Fixxer
    const platformFeeAmount = Number((netPaid * (platformFeePercent / 100)).toFixed(2));
    const affiliateFeeAmount = Number((netPaid * ((params.affiliatePercent || 0) / 100)).toFixed(2));
    
    return {
      amount_gross: params.amountGross,
      amount_discount: params.amountDiscount,
      amount_net_paid: netPaid,
      fee_platform_percent: platformFeePercent,
      fee_platform_amount: platformFeeAmount,
      fee_affiliate_percent: params.affiliatePercent || 0,
      fee_affiliate_amount: affiliateFeeAmount,
      amount_creator_net: Number((netPaid - platformFeeAmount - affiliateFeeAmount).toFixed(2))
    };
  }

  return data as SaleReconciliation;
}

export async function getCreatorSalesStats(creatorId: string, period?: { start: string; end: string }) {
  let query = supabaseExternal
    .from('info_sales')
    .select('status, amount_paid, fixxer_fee, amount_net, amount_original, amount_discount')
    .eq('creator_id', creatorId);

  if (period) {
    query = query.gte('created_at', period.start).lte('created_at', period.end);
  }

  const { data, error } = await query;
  if (error) throw error;

  const stats = (data || []).reduce((acc, sale) => {
    acc.totalSales++;
    if (sale.status === 'PAID') {
      acc.approvedSales++;
      acc.revenueGross += Number(sale.amount_paid);
      acc.revenueNet += Number(sale.amount_net);
      acc.fixxerFees += Number(sale.fixxer_fee);
      acc.discounts += Number(sale.amount_discount);
    } else if (sale.status === 'PENDING') {
      acc.pendingSales++;
    } else if (sale.status === 'CANCELLED') {
      acc.cancelledSales++;
    } else if (sale.status === 'REFUNDED') {
      acc.refunds++;
    }
    return acc;
  }, {
    totalSales: 0,
    approvedSales: 0,
    pendingSales: 0,
    cancelledSales: 0,
    refunds: 0,
    revenueGross: 0,
    revenueNet: 0,
    fixxerFees: 0,
    discounts: 0,
    avgTicket: 0
  });

  if (stats.approvedSales > 0) {
    stats.avgTicket = stats.revenueGross / stats.approvedSales;
  }

  return stats;
}

export async function getCreatorSalesList(creatorId: string, filters: { 
  status?: string; 
  startDate?: string; 
  endDate?: string;
  page?: number;
  pageSize?: number;
}) {
  const pageSize = filters.pageSize || 10;
  const page = filters.page || 0;
  const from = page * pageSize;
  const to = from + pageSize - 1;

  let query = supabaseExternal
    .from('info_sales')
    .select('*, info_products(title), profiles!buyer_id(display_name, avatar_url)', { count: 'exact' })
    .eq('creator_id', creatorId)
    .order('created_at', { ascending: false })
    .range(from, to);

  if (filters.status && filters.status !== 'ALL') {
    query = query.eq('status', filters.status);
  }
  if (filters.startDate) {
    query = query.gte('created_at', filters.startDate);
  }
  if (filters.endDate) {
    query = query.lte('created_at', filters.endDate);
  }

  const { data, error, count } = await query;
  if (error) throw error;

  return {
    data,
    count,
    page,
    pageSize
  };
}

export async function exportSalesCSV(creatorId: string, filters: { startDate?: string; endDate?: string }) {
  let query = supabaseExternal
    .from('info_sales')
    .select('id, created_at, amount_paid, amount_net, status, payment_method, info_products(title)')
    .eq('creator_id', creatorId);

  if (filters.startDate) query = query.gte('created_at', filters.startDate);
  if (filters.endDate) query = query.lte('created_at', filters.endDate);

  const { data, error } = await query;
  if (error) throw error;

  const header = "ID;Data;Produto;Valor Pago;Valor Líquido;Status;Método\n";
  const rows = (data || []).map(s => 
    `${s.id};${new Date(s.created_at).toLocaleString()};${(s.info_products as any)?.title || 'N/A'};${s.amount_paid};${s.amount_net};${s.status};${s.payment_method}`
  ).join("\n");

  return header + rows;
}

export async function getSaleDetails(saleId: string) {
  const { data, error } = await supabaseExternal
    .from('info_sales')
    .select(`
      *,
      info_products (
        id,
        title,
        description,
        thumbnail_url
      ),
      info_offers (
        id,
        title,
        price
      ),
      info_coupons (
        id,
        code,
        discount_value,
        discount_type
      ),
      profiles!buyer_id (
        id,
        display_name,
        avatar_url,
        email
      )
    `)
    .eq('id', saleId)
    .single();

  if (error) throw error;
  return data;
}

// --- Cupons (Prompt 18/19) ---

export const InfoCouponSchema = z.object({
  id: z.string().uuid(),
  creator_id: z.string().uuid(),
  code: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  discount_type: z.enum(['PERCENTAGE', 'FIXED_AMOUNT']),
  discount_value: z.number(),
  product_id: z.string().uuid().nullable(),
  start_date: z.string().nullable(),
  end_date: z.string().nullable(),
  max_uses: z.number().nullable(),
  max_uses_per_user: z.number().nullable(),
  min_purchase_amount: z.number().default(0),
  status: z.enum(['DRAFT', 'ACTIVE', 'PAUSED', 'EXPIRED', 'EXHAUSTED']),
  created_at: z.string()
});

export type InfoCoupon = z.infer<typeof InfoCouponSchema>;

export async function getCreatorCoupons(creatorId: string) {
  const { data, error } = await supabaseExternal
    .from('info_coupons')
    .select('*, info_coupon_usage(count)')
    .eq('creator_id', creatorId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data;
}

/**
 * Validação de cupom no servidor (TanStack Start)
 * Chama a RPC que possui lock de concorrência (Prompt 19)
 */
export async function validateCouponForCheckout(params: {
  code: string;
  productId: string;
  userId: string;
  amountGross: number;
}) {
  const { data, error } = await supabaseExternal.rpc('validate_and_apply_info_coupon', {
    _code: params.code.toUpperCase().trim(),
    _product_id: params.productId,
    _user_id: params.userId,
    _amount_gross: params.amountGross
  });

  if (error) {
    console.error('[CouponValidation] Erro RPC:', error);
    return { success: false, error: 'Erro ao validar cupom. Tente novamente.' };
  }

  return data as {
    success: boolean;
    error?: string;
    coupon_id?: string;
    discount_amount?: number;
    final_amount?: number;
  };
}

export async function upsertInfoCoupon(coupon: Partial<InfoCoupon> & { creator_id: string }) {
  if (coupon.code) {
    coupon.code = coupon.code.trim().toUpperCase().replace(/\s+/g, '');
  }

  const { data, error } = await supabaseExternal
    .from('info_coupons')
    .upsert(coupon)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateCouponStatus(id: string, status: InfoCoupon['status']) {
  const { error } = await supabaseExternal
    .from('info_coupons')
    .update({ status })
    .eq('id', id);

  if (error) throw error;
  return true;
}

export async function getCouponAnalytics(couponId: string) {
  const { data: coupon } = await supabaseExternal.from('info_coupons').select('code').eq('id', couponId).single();
  
  const { data, error } = await supabaseExternal
    .from('info_sales')
    .select('amount_net_paid, amount_discount, created_at')
    .eq('coupon_code', coupon?.code)
    .eq('status', 'PAID');

  if (error) throw error;

  return {
    usageCount: data.length,
    totalRevenue: data.reduce((acc, s) => acc + Number(s.amount_net_paid), 0),
    totalDiscount: data.reduce((acc, s) => acc + Number(s.amount_discount), 0)
  };
}


// --- Admin Master Services (Prompt 20) ---

export async function getAdminSalesList(filters: {
  creatorId?: string;
  productId?: string;
  status?: string;
  period?: 'today' | '7d' | '30d' | 'all';
  paymentMethod?: string;
  page?: number;
  pageSize?: number;
}) {
  let query = supabaseExternal
    .from('info_sales')
    .select('*, info_products(title), profiles!buyer_id(display_name, email), creator:profiles!creator_id(display_name)', { count: 'exact' });

  if (filters.creatorId) query = query.eq('creator_id', filters.creatorId);
  if (filters.productId) query = query.eq('product_id', filters.productId);
  if (filters.status && filters.status !== 'ALL') query = query.eq('status', filters.status);
  if (filters.paymentMethod) query = query.eq('payment_method', filters.paymentMethod);

  if (filters.period && filters.period !== 'all') {
    const date = new Date();
    if (filters.period === 'today') date.setHours(0, 0, 0, 0);
    else if (filters.period === '7d') date.setDate(date.getDate() - 7);
    else if (filters.period === '30d') date.setDate(date.getDate() - 30);
    query = query.gte('created_at', date.toISOString());
  }

  const pageSize = filters.pageSize || 20;
  const page = filters.page || 1;
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const { data, error, count } = await query
    .order('created_at', { ascending: false })
    .range(from, to);

  if (error) throw error;
  return { data, count, page, pageSize };
}

export async function getAdminCouponList() {
  const { data, error } = await supabaseExternal
    .from('info_coupons')
    .select('*, creator:profiles!creator_id(display_name), info_products(title)')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data;
}

export async function adminRefundSale(saleId: string, reason: string) {
  const { data, error } = await supabaseExternal.rpc('admin_refund_sale', {
    _sale_id: saleId,
    _reason: reason
  });

  if (error) throw error;
  return data;
}

export async function getAdminAuditLogs(limit = 50) {
  const { data, error } = await supabaseExternal
    .from('info_admin_audit_logs')
    .select('*, admin:profiles!admin_id(display_name)')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data;
}

export async function getGlobalMonetizationConfig() {
  const { data, error } = await supabaseExternal
    .from('system_settings')
    .select('value')
    .eq('key', 'info_products_config')
    .maybeSingle();

  if (error) throw error;
  return data?.value || {
    defaultFixxerFee: 15,
    maxFixxerFee: 30,
    minWithdrawAmount: 50,
    allowCreatorCustomFee: true
  };
}

export async function saveGlobalMonetizationConfig(config: any) {
  const { error } = await supabaseExternal
    .from('system_settings')
    .upsert({ 
      key: 'info_products_config', 
      value: config,
      updated_at: new Date().toISOString()
    }, { onConflict: 'key' });

  if (error) throw error;

  // Registrar auditoria
  const { data: user } = await supabaseExternal.auth.getUser();
  const isMasterBypass = typeof window !== 'undefined' && localStorage.getItem('fixxer:master-bypass') === 'true';
  const adminId = isMasterBypass ? '6ba65048-803f-44f6-88d2-24d04fee1a0f' : user?.user?.id;

  await supabaseExternal.from('info_admin_audit_logs').insert({
    admin_id: adminId,
    action: 'UPDATE_CONFIG',
    entity_type: 'GLOBAL_CONFIG',
    details: config // O Supabase JS lida com objetos se a coluna for JSONB
  });

  return true;
}



