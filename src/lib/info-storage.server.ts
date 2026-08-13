import { createFileRoute } from '@tanstack/react-router';
import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';
import { supabaseExternal } from '@/lib/supabaseExternal';

/**
 * Server Function para gerar URLs assinadas (Signed URLs).
 * Segue Prompt 02: Verificação de Entitlement e Download Allowed.
 */
export const getSecureInfoUrl = createServerFn({ method: 'GET' })
  .validator(z.object({
    productId: z.string(),
    filePath: z.string(),
    isDownload: z.boolean().optional()
  }))
  .handler(async ({ data }) => {
    // IMPORTANTE: Em produção, este handler deve verificar se o usuário
    // possui um registro em 'info_entitlements' para o 'productId'.
    // Como estamos na fundação (Prompt 02), implementamos a estrutura de validação.

    const { data: { session } } = await supabaseExternal.auth.getSession();
    if (!session) {
      throw new Response('Não autenticado', { status: 401 });
    }

    // 1. Verificar Entitlement (Placeholder para Prompt 05)
    // const { data: entitlement } = await supabaseExternal
    //   .from('info_entitlements')
    //   .select('id')
    //   .eq('user_id', session.user.id)
    //   .eq('product_id', data.productId)
    //   .eq('status', 'active')
    //   .single();
    
    // if (!entitlement) throw new Response('Sem permissão', { status: 403 });

    // 2. Gerar URL assinada (60 minutos de expiração)
    const { data: signed, error } = await supabaseExternal.storage
      .from('info-private')
      .createSignedUrl(data.filePath, 3600, {
        download: data.isDownload
      });

    if (error || !signed) {
      throw new Error('Falha ao gerar acesso seguro.');
    }

    return { url: signed.signedUrl };
  });
