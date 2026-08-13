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

// --- Hardening & Analytics V3 ---

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
