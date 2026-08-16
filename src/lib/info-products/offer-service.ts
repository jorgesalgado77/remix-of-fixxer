import { supabaseExternal } from "@/lib/supabaseExternal";
import { z } from "zod";

export const InfoOfferSchema = z.object({
  id: z.string().uuid(),
  creator_id: z.string().uuid(),
  product_id: z.string().uuid(),
  name: z.string(),
  description: z.string().nullable(),
  price: z.number(),
  compare_at_price: z.number().nullable(),
  max_sales: z.number().nullable(),
  sales_count: z.number(),
  starts_at: z.string(),
  expires_at: z.string().nullable(),
  status: z.enum(['DRAFT', 'ACTIVE', 'PAUSED', 'EXPIRED', 'SOLD_OUT', 'ARCHIVED']),
  is_featured: z.boolean(),
  created_at: z.string(),
  updated_at: z.string()
});

export type InfoOffer = z.infer<typeof InfoOfferSchema>;

export async function getProductOffers(productId: string) {
  const { data, error } = await supabaseExternal
    .from('info_offers')
    .select('*')
    .eq('product_id', productId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data as InfoOffer[];
}

export async function getActiveOffer(productId: string) {
  const { data, error } = await supabaseExternal
    .from('info_offers')
    .select('*')
    .eq('product_id', productId)
    .eq('status', 'ACTIVE')
    .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`)
    .order('price', { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return data as InfoOffer | null;
}

export async function createInfoOffer(offer: Omit<InfoOffer, 'id' | 'created_at' | 'updated_at' | 'sales_count'>) {
  const { data, error } = await supabaseExternal
    .from('info_offers')
    .insert([offer])
    .select()
    .single();

  if (error) throw error;
  return data as InfoOffer;
}

export async function updateOfferStatus(offerId: string, status: InfoOffer['status']) {
  const { data, error } = await supabaseExternal
    .from('info_offers')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', offerId)
    .select()
    .single();

  if (error) throw error;
  return data as InfoOffer;
}
