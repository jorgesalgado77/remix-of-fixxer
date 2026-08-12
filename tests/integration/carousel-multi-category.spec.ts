import { test, expect } from '@playwright/test';

/**
 * E2E: carrosséis públicos (lojistas/fornecedores e sugestões B2B).
 * Garante que os cards SEMPRE aparecem — mesmo com colunas ausentes (42703),
 * dados incompletos ou ausência total de transações.
 */

const PROFILES = [
  {
    id: 'user-lojista-1',
    full_name: 'Loja Teste',
    display_name: 'LOJA TESTE',
    company_name: 'Loja Teste LTDA',
    role: 'lojista',
    user_type: 'lojista',
    city: 'Sorocaba',
    state: 'SP',
    lat: -23.5015,
    lng: -47.4521,
  },
  {
    id: 'user-fornecedor-1',
    full_name: 'Fornecedor Teste',
    role: 'fornecedor',
    user_type: 'fornecedor',
    city: null, // dados incompletos propositalmente
    state: null,
    lat: null,
    lng: null,
  },
  {
    id: 'user-prestador-1',
    full_name: 'Prestador Teste',
    role: 'prestador',
    user_type: 'prestador',
    city: 'Votorantim',
    state: 'SP',
    lat: -23.54,
    lng: -47.44,
  },
];

async function mockProfilesPublic(page: any, opts: { breakColumns?: boolean; empty?: boolean } = {}) {
  await page.route('**/rest/v1/profiles_public*', async (route: any) => {
    const url = route.request().url();
    if (opts.breakColumns && url.includes('created_at')) {
      await route.fulfill({
        status: 400,
        contentType: 'application/json',
        body: JSON.stringify({
          code: '42703',
          message: 'column profiles_public.created_at does not exist',
        }),
      });
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(opts.empty ? [] : PROFILES),
    });
  });
}

test.describe('Carrossel público — múltiplos cenários', () => {
  test('renderiza cards mesmo com erro de coluna (42703)', async ({ page }) => {
    await mockProfilesPublic(page, { breakColumns: true });
    await page.goto('/');
    await expect(page.getByText(/Loja Teste/i).first()).toBeVisible({ timeout: 15000 });
  });

  test('renderiza cards com dados incompletos (sem cidade/coordenadas)', async ({ page }) => {
    await mockProfilesPublic(page);
    await page.goto('/');
    await expect(page.getByText(/Fornecedor Teste/i).first()).toBeVisible({ timeout: 15000 });
  });

  test('mostra fallback claro quando não há perfis', async ({ page }) => {
    await mockProfilesPublic(page, { empty: true });
    await page.goto('/');
    await expect(
      page.getByText(/Nenhum parceiro|Tentar novamente|Nenhum resultado/i).first(),
    ).toBeVisible({ timeout: 15000 });
  });

  test('persiste cards via cache SWR ao navegar entre seções', async ({ page }) => {
    await mockProfilesPublic(page);
    await page.goto('/');
    await expect(page.getByText(/Loja Teste/i).first()).toBeVisible({ timeout: 15000 });

    // Segunda navegação: bloqueia a rede e valida hidratação pelo cache.
    await page.route('**/rest/v1/profiles_public*', (route: any) => route.abort());
    await page.goto('/');
    await expect(page.getByText(/Loja Teste/i).first()).toBeVisible({ timeout: 15000 });
  });
});
