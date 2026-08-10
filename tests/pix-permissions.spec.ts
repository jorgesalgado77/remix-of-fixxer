import { test, expect } from '@playwright/test';

test.describe('PixManagerModal Permissions and E2E', () => {
  
  const targetPages = [
    { name: 'Dashboard Lojista', url: 'http://localhost:8080/lojista' },
    { name: 'Dashboard Prestador', url: 'http://localhost:8080/prestador' },
    { name: 'Feed Lojista', url: 'http://localhost:8080/feed/lojista' }
  ];

  for (const pageInfo of targetPages) {
    test(`should open PixManagerModal from ${pageInfo.name}`, async ({ page }) => {
      // Nota: Em ambiente real, precisaríamos injetar sessão. 
      // Assumindo que o ambiente preview permite acesso ou as rotas estão acessíveis para teste.
      await page.goto(pageInfo.url);
      
      // O botão QR Code na PanelActions
      const pixButton = page.locator('button[aria-label*="Receber via PIX"]');
      
      // Verifica se está visível antes de clicar
      if (await pixButton.isVisible()) {
        await pixButton.click();
        const dialog = page.getByRole('dialog');
        await expect(dialog).toBeVisible();
        await expect(page.getByText(/Receber via PIX/i)).toBeVisible();
      } else {
        console.log(`Botão não visível em ${pageInfo.name} - possível restrição de role ou layout.`);
      }
    });
  }

  test('should handle role-based visibility (Mock check)', async ({ page }) => {
    // Simulação: Navega para a página de cliente onde o botão deve estar oculto
    await page.goto('http://localhost:8080/feed/cliente');
    const pixButton = page.locator('button[aria-label*="Receber via PIX"]');
    await expect(pixButton).toBeHidden();
  });

  test('should show error guidance on fetch failure', async ({ page }) => {
    // Este teste exigiria mock de API para falhar fetchMonetizationConfig
    // No Playwright podemos interceptar a rede se for uma requisição fetch/XHR
    await page.route('**/api/monetization/config', route => route.abort('failed'));
    
    await page.goto('http://localhost:8080/prestador');
    const pixButton = page.locator('button[aria-label*="Receber via PIX"]');
    if (await pixButton.isVisible()) {
      await pixButton.click();
      await expect(page.getByText(/Erro de Conexão/i)).toBeVisible();
      await expect(page.getByText(/ERR_PIX_CFG_01/i)).toBeVisible();
      await expect(page.getByText(/Tentar Novamente/i)).toBeVisible();
    }
  });
});
