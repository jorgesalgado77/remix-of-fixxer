import { supabaseExternal } from "@/lib/supabaseExternal";
import { z } from "zod";

export const InfoProductSchema = z.object({
  id: z.string().uuid(),
  creator_id: z.string().uuid(),
  title: z.string(),
  description: z.string().nullable(),
  category: z.enum(['ebook', 'video', 'course']),
  price: z.number(),
  cover_url: z.string().nullable(),
  preview_url: z.string().nullable(),
  status: z.enum(['draft', 'published', 'archived']),
  created_at: z.string(),
  updated_at: z.string(),
  // Campos virtuais/agregados
  creator_name: z.string().optional(),
  creator_avatar: z.string().nullable().optional(),
  rating_avg: z.number().optional().default(0),
  rating_count: z.number().optional().default(0),
});

export type InfoProduct = z.infer<typeof InfoProductSchema>;

export async function getPublicInfoProducts(filters?: {
  category?: string;
  minPrice?: number;
  maxPrice?: number;
  sort?: 'newest' | 'bestseller' | 'rating';
  search?: string;
  page?: number;
  pageSize?: number;
}) {
  const pageSize = filters?.pageSize ?? 20;
  const page = filters?.page ?? 1;
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = supabaseExternal
    .from('info_products')
    .select('*', { count: 'exact' })
    .eq('status', 'published');

  if (filters?.category) {
    query = query.eq('category', filters.category);
  }

  if (filters?.search) {
    query = query.ilike('title', `%${filters.search}%`);
  }

  if (filters?.minPrice !== undefined) {
    query = query.gte('price', filters.minPrice);
  }

  if (filters?.maxPrice !== undefined) {
    query = query.lte('price', filters.maxPrice);
  }

  // Ordenação
  if (filters?.sort === 'newest') {
    query = query.order('created_at', { ascending: false });
  } else if (filters?.sort === 'rating') {
    query = query.order('rating_avg', { ascending: false, nullsFirst: false });
  } else {
    query = query.order('created_at', { ascending: false });
  }

  const { data, error, count } = await query.range(from, to);

  if (error) throw error;

  return {
    products: (data || []) as InfoProduct[],
    total: count || 0,
    page,
    pageSize
  };
}

export async function getInfoProductDetails(id: string) {
  const { data, error } = await supabaseExternal
    .from('info_products')
    .select(`
      *,
      modules:info_product_modules(
        *,
        lessons:info_product_lessons(*)
      )
    `)
    .eq('id', id)
    .eq('status', 'published')
    .maybeSingle();

  if (error) throw error;
  return data;
}
