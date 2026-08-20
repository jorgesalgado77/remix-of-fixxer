import { test, expect } from '@playwright/test';

test.describe('Prompt 25: Auditoria de Sincronização e Recuperação FK', () => {
  test('deve detectar erro 23503 e mostrar botão de recuperação', async ({ page }) => {
    // Simular o estado de erro 23503 via evento customizado no console
    await page.goto('http://localhost:8080/auth');
    
    // Injetar o erro manualmente para validar a UI do componente ProfileSyncStatus (que aparece no dashboard)
    // Para o teste, vamos navegar para uma rota que use o componente, ex: /prestador
    await page.goto('http://localhost:8080/feed/prestador');

    const errorDetected = await page.evaluate(() => {
      window.dispatchEvent(new CustomEvent("fixxer:integrity-error", { 
        detail: { table: 'profiles (FK Violation)', userId: 'b3378b88-5c46-4e50-9c2e-4b7264a4d6e9', code: '23503' } 
      }));
      return true;
    });

    expect(errorDetected).toBe(true);
    
    // Verificar se o alerta de erro aparece
    const alert = page.locator('text=Erro de Vínculo (Chave Estrangeira)');
    await expect(alert).toBeVisible();

    // Verificar se o botão de recuperação aparece
    const recoveryBtn = page.locator('text=Recuperar FK Ausente');
    await expect(recoveryBtn).toBeVisible();
  });
});
