import { test, expect } from '@playwright/test';
import { supabaseExternal } from '../lib/supabaseExternal';

test.describe('ProfileSummaryCard Identity Resolution', () => {
  test('should render authenticated user name and avatar correctly', async ({ page }) => {
    // 1. Navegar para a página inicial (Dashboard)
    await page.goto('http://localhost:8080/');

    // 2. Verificar se o card de resumo está presente
    const profileCard = page.locator('aside[aria-label="Resumo do meu perfil"]');
    await expect(profileCard).toBeVisible({ timeout: 10000 });

    // 3. Verificar o nome do usuário (Jorge Salgado é o usuário injetado no sandbox)
    // O texto no ProfileSummaryCard é uppercase e itálico por CSS, mas o conteúdo é "JORGE SALGADO"
    const nameLabel = profileCard.locator('div.text-sm.font-black.uppercase');
    await expect(nameLabel).toContainText('JORGE SALGADO', { timeout: 15000 });

    // 4. Verificar se a imagem de avatar está carregada ou se há um fallback
    const avatarImg = profileCard.locator('img');
    const userIcon = profileCard.locator('svg.lucide-user');
    
    const hasAvatar = await avatarImg.isVisible();
    const hasIcon = await userIcon.isVisible();
    
    expect(hasAvatar || hasIcon).toBeTruthy();

    if (hasAvatar) {
      const src = await avatarImg.getAttribute('src');
      expect(src).not.toBeNull();
      expect(src).not.toBe('');
    }

    // 5. Verificar categoria (deve ser PRESTADOR conforme histórico)
    const categoryBadge = profileCard.locator('div.bg-primary\\/15');
    await expect(categoryBadge).toContainText('PRESTADOR');
  });

  test('should persist identity across navigation without flickering', async ({ page }) => {
    await page.goto('http://localhost:8080/');
    const profileCard = page.locator('aside[aria-label="Resumo do meu perfil"]');
    await expect(profileCard).toBeVisible();
    
    const initialName = await profileCard.locator('div.text-sm.font-black.uppercase').innerText();
    
    // Navegar para outra página (ex: Configurações/Perfil)
    await page.click('a[href*="profile"]');
    
    // Verificar se o nome permanece o mesmo e não volta para "Carregando..." ou "Usuário"
    const newName = await profileCard.locator('div.text-sm.font-black.uppercase').innerText();
    expect(newName).toBe(initialName);
  });
});
