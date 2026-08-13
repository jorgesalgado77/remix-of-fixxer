import { supabaseExternal } from "@/lib/supabaseExternal";
import { z } from "zod";

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
  // Retorna apenas dados essenciais para validação pública, evitando PII sensível
  const { data, error } = await supabaseExternal
    .from('info_certificates')
    .select('course_name, creator_name, workload_hours, issued_at, status')
    .eq('unique_code', code)
    .maybeSingle();
    
  if (error) throw error;
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
