import { supabaseExternal } from "@/lib/supabaseExternal";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export interface Entitlement {
  id: string;
  user_id: string;
  product_id: string;
  purchase_id: string | null;
  status: 'active' | 'revoked' | 'expired';
  granted_at: string;
  revoked_at: string | null;
  expiration: string | null;
  metadata: any;
}

/**
 * Verifica se o usuário tem acesso a um produto específico.
 * Lógica centralizada para evitar bypass no frontend.
 */
export const checkUserEntitlement = createServerFn({ method: "GET" })
  .validator((data: unknown) => z.object({
    productId: z.string().uuid(),
    userId: z.string().uuid().optional(),
  }).parse(data))
  .handler(async ({ data, context }) => {
    const targetUserId = data.userId;
    
    if (!targetUserId) return { hasAccess: false };

    const { data: entitlement, error } = await supabaseExternal
      .from('info_product_entitlements')
      .select('status, expiration')
      .eq('user_id', targetUserId)
      .eq('product_id', data.productId)
      .eq('status', 'active')
      .maybeSingle();

    if (error || !entitlement) return { hasAccess: false };

    // Verificar expiração se houver
    if (entitlement.expiration && new Date(entitlement.expiration) < new Date()) {
      return { hasAccess: false, reason: 'expired' };
    }

    return { hasAccess: true, entitlement };
  });

/**
 * Busca a biblioteca do usuário logado (produtos adquiridos).
 */
export async function getMyLibrary(userId: string) {
  const { data, error } = await supabaseExternal
    .from('info_product_entitlements')
    .select(`
      *,
      product:info_products (
        id,
        title,
        cover_url,
        category,
        creator_id
      )
    `)
    .eq('user_id', userId)
    .eq('status', 'active')
    .order('granted_at', { ascending: false });

  if (error) throw error;
  
  // Filtrar produtos que possam ter sido deletados/arquivados se necessário
  return (data || []).filter(item => item.product);
}
