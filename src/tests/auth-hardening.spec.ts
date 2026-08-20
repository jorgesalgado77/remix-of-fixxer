import { test, expect } from '@playwright/test';

test.describe('Auth Hardening Regression', () => {
  test('should disable login button during authentication', async ({ page }) => {
    await page.goto('http://localhost:8080/auth');
    
    await page.fill('input[type="email"]', 'test@example.com');
    await page.fill('input[type="password"]', 'password123');
    
    // Clica e verifica estado disabled imediatamente
    await page.click('#login-submit-btn');
    const button = page.locator('#login-submit-btn');
    await expect(button).toBeDisabled();
  });

  test('should persist input values on failed login', async ({ page }) => {
    await page.goto('http://localhost:8080/auth');
    
    const testEmail = 'wrong@email.com';
    await page.fill('input[type="email"]', testEmail);
    await page.fill('input[type="password"]', 'wrongpass');
    
    await page.click('#login-submit-btn');
    
    // Aguarda o brinde de erro e verifica se os campos continuam preenchidos
    await expect(page.locator('input[type="email"]')).toHaveValue(testEmail);
  });
});
