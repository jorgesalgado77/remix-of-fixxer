import { test, expect } from '@playwright/test';

test.describe('Estabilidade dos Carrosséis de Profissionais', () => {
  test.beforeEach(async ({ page }) => {
    // Mock do Supabase para simular erro de coluna ausente (42703)
    // Isso garante que o fallback defensivo no frontend funcione
    await page.route('**/rest/v1/profiles_public*', async (route) => {
      const url = route.request().url();
      if (url.includes('select=') && url.includes('created_at')) {
        // Simula erro de coluna ausente se tentar selecionar created_at explicitamente
        await route.fulfill({
          status: 400,
          contentType: 'application/json',
          body: JSON.stringify({
            code: '42703',
            message: 'column profiles_public.created_at does not exist',
            hint: 'Perhaps you meant to reference the column "profiles_public.id".'
          })
        });
      } else {
        // Retorno normal para query sem a coluna problemática
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([
            {
              id: 'test-user-1',
              full_name: 'Prestador de Teste',
              role: 'prestador',
              city: 'Sorocaba',
              state: 'SP',
              lat: -23.5015,
              lng: -47.4521
            }
          ])
        });
      }
    });

    await page.goto('/');
  });

  test('RecentStoresCarousel deve renderizar mesmo com erro de coluna created_at', async ({ page }) => {
    // Verifica se o carrossel de lojas/parceiros está visível
    const carousel = page.locator('section[aria-label*="Lojistas e Fornecedores Recentes"]');
    await expect(carousel).toBeVisible();
    
    // Verifica se pelo menos um card foi renderizado (indicando que o fallback funcionou)
    const card = page.locator('button:has-text("Prestador de Teste")').first();
    await expect(card).toBeVisible();
  });

  test('RecentPartnersCarousel deve renderizar mesmo com erro de coluna created_at', async ({ page }) => {
    // Verifica se o carrossel de prestadores está visível
    const carousel = page.locator('section[aria-label*="Prestadores e Parceiros Recentes"]');
    await expect(carousel).toBeVisible();

    const card = page.locator('button:has-text("Prestador de Teste")').first();
    await expect(card).toBeVisible();
  });
});
