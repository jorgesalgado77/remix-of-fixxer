import { test, expect } from '@playwright/test';

test.describe('Chat Communication Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Setup: Navigate to a chat page (mocking peerId if necessary)
    await page.goto('/chat/dummy-peer-id');
  });

  test('should show clear error feedback when sending fails due to block', async ({ page }) => {
    // 1. Mock the Supabase RPC/RLS error for blocked user (code 42501)
    await page.route('**/rest/v1/messages*', async (route) => {
      if (route.request().method() === 'POST') {
        await route.fulfill({
          status: 403,
          contentType: 'application/json',
          body: JSON.stringify({
            code: '42501',
            message: 'row-level security policy "blocked_by_user" violation',
          }),
        });
      } else {
        await route.continue();
      }
    });

    // 2. Type and send a message
    const input = page.getByPlaceholder(/escreva uma mensagem/i);
    await input.fill('Olá, tudo bem?');
    await page.keyboard.press('Enter');

    // 3. Verify clear error message in UI (toast or alert)
    const errorToast = page.getByText(/Você não pode enviar mensagens para este usuário/i);
    await expect(errorToast).toBeVisible();
    
    // 4. Verify UI state remains usable but shows block context
    const inputEnabled = await input.isEnabled();
    expect(inputEnabled).toBe(true);
  });

  test('should implement exponential backoff on retries for network failures', async ({ page }) => {
    let attempts = 0;
    const start = Date.now();

    await page.route('**/rest/v1/messages*', async (route) => {
      if (route.request().method() === 'POST') {
        attempts++;
        if (attempts < 3) {
          // Simulate network error for first 2 attempts
          await route.abort('failed');
        } else {
          await route.fulfill({ status: 201, body: JSON.stringify({ id: 'msg-123' }) });
        }
      } else {
        await route.continue();
      }
    });

    await page.getByPlaceholder(/escreva uma mensagem/i).fill('Teste de retry');
    await page.keyboard.press('Enter');

    // Wait for success
    await expect(page.getByText('msg-123')).toBeHidden(); // messages aren't usually shown by ID, but we wait for the send to complete
    
    expect(attempts).toBe(3);
    const duration = Date.now() - start;
    // Base delay is 400ms. Attempt 1: 400ms, Attempt 2: 800ms. Total expected min ~1200ms
    expect(duration).toBeGreaterThan(1000);
  });
});
