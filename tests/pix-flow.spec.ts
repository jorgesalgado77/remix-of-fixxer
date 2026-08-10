import { test, expect } from '@playwright/test';

test.describe('PixManagerModal Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to a page that contains PanelActions, e.g., /feed/lojista or similar
    // For local dev preview we can try the root if the dashboard is there
    await page.goto('http://localhost:8080/feed/lojista');
  });

  test('should open PixManagerModal when clicking the QR Code button', async ({ page }) => {
    const pixButton = page.getByRole('button', { name: /Receber via PIX/i });
    
    // Check if button exists
    await expect(pixButton).toBeVisible();
    
    // Click it
    await pixButton.click();
    
    // Check if dialog opens
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    
    // Check for modal title
    await expect(page.getByText(/Receber via PIX/i)).toBeVisible();
  });

  test('should not show Pix button for client role', async ({ page }) => {
    // This test depends on how roles are handled in the preview environment.
    // If we can inject a client role, we check the button is hidden.
  });
});
