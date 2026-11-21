import { test, expect } from '@playwright/test';
import { api, print, run } from './helpers';

test('planos: arquivar com confirmação e reativar', async ({ page }) => {
  await page.goto('/planos');
  const name = `Arquivar E2E ${run}`;
  await api(page, 'POST', '/plans', {
    name,
    priceCents: 5000,
    intervalDays: 30,
    benefits: [],
  });
  await page.reload();

  await page.getByRole('button', { name: `Arquivar plano ${name}` }).click();
  const confirm = page.getByRole('dialog', { name: 'Arquivar plano?' });
  await expect(confirm).toContainText('Quem já assina continua');
  await confirm.getByRole('button', { name: 'Arquivar plano' }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Plano arquivado.' })).toBeVisible();
  await expect(page.getByRole('button', { name: `Reativar plano ${name}` })).toBeVisible();
  await print(page, 'planos');

  await page.getByRole('button', { name: `Reativar plano ${name}` }).click();
  await page.getByRole('dialog', { name: 'Reativar plano?' }).getByRole('button', { name: 'Reativar plano' }).click();
  await expect(page.getByRole('button', { name: `Arquivar plano ${name}` })).toBeVisible();
});
