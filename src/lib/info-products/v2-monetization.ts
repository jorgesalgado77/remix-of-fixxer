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
  const { data, error } = await supabaseExternal
    .from('info_certificates')
    .select('student_name, course_name, creator_name, workload_hours, issued_at, status')
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
