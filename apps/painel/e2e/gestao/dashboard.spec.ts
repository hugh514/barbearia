import { test, expect } from '@playwright/test';
import { print } from './helpers';

test('dashboard troca o período pela URL', async ({ page }) => {
  await page.goto('/dashboard');
  const period = page.getByRole('navigation', { name: 'Período' });
  await expect(period.getByRole('link', { name: 'Hoje' })).toHaveAttribute('aria-current', 'page');
  await expect(page.getByTestId('comparacao')).toContainText(/ontem até esta hora/i);
  await expect(page.getByText('Ocupação')).toHaveCount(0);

  await period.getByRole('link', { name: '7 dias' }).click();
  await expect(page).toHaveURL(/period=7d/);
  await expect(page.getByTestId('comparacao')).toContainText(/7 dias anteriores/i);
  await expect(page.getByRole('heading', { name: 'Atendimentos por dia' })).toBeVisible();

  await period.getByRole('link', { name: 'Mês' }).click();
  await expect(page).toHaveURL(/period=month/);
  await expect(page.getByTestId('comparacao')).toContainText(/mês passado/i);
  await print(page, 'dashboard');
});
