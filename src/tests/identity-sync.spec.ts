// TEST E2E: IDENTITY SYNC - PROMPT 25
// Simula login e valida sincronização de Jorge Salgado (Prestador)

import { test, expect } from '@playwright/test';

test('Jorge Salgado Identity Sync Test', async ({ page }) => {
  // 1. Acesso à página de login
  await page.goto('http://localhost:8080/auth');
  
  // 2. Login Master Bypass Jorge Salgado
  await page.fill('input[name="email"]', 'jorgecriare2021@gmail.com');
  await page.fill('input[name="password"]', '!jR06097');
  await page.click('#login-submit-btn');

  // 3. Aguardar redirecionamento para o feed de prestador
  await expect(page).toHaveURL(/.*\/feed\/prestador|.*\/prestador/);

  // 4. Verificar elementos de identidade canônica (v1.4)
  const displayName = page.locator('text=Jorge Salgado').first();
  await expect(displayName).toBeVisible();

  // 5. Verificar saldo de moedas sincronizado (3600)
  const balance = page.locator('text=3600').first();
  await expect(balance).toBeVisible();

  // 6. Verificar integridade (ProfileSyncStatus)
  const syncStatus = page.locator('text=Status de Sincronização');
  await expect(syncStatus).toBeVisible();
});
