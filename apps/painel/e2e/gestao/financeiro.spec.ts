import { test, expect } from '@playwright/test';
import { api, newCustomer, print, run } from './helpers';

let planId: string;

test.beforeEach(async ({ page }) => {
  // O filtro precisa de um pagamento aprovado no período, sem depender de outra spec.
  await page.goto('/financeiro');
  const plan = await api<{ id: string }>(page, 'POST', '/plans', {
    name: `Financeiro E2E ${run}-${Date.now()}`,
    priceCents: 4000,
    intervalDays: 30,
    benefits: [],
  });
  planId = plan.id;
  const customer = await newCustomer(page, `Financeiro E2E ${run}`);
  const sub = await api<{ id: string }>(page, 'POST', '/subscriptions', {
    customerId: customer.id,
    planId: plan.id,
    activateNow: false,
  });
  const payment = await api<{ id: string }>(page, 'POST', '/payments', {
    subscriptionId: sub.id,
    method: 'PIX',
  });
  await api(page, 'POST', `/payments/${payment.id}/mock-approve`);
});

test.afterEach(async ({ page }) => {
  // Arquiva o plano de apoio para não encher a vitrine do tenant a cada execução.
  const res = await page.request.delete(`/api/plans/${planId}`);
  expect(res.ok(), `DELETE /plans: ${res.status()}`).toBeTruthy();
});

test('financeiro filtra por status e troca o período mantendo o filtro', async ({ page }) => {
  await page.goto('/financeiro?period=today');
  await expect(page.getByRole('heading', { name: 'Financeiro' })).toBeVisible();
  await expect(page.getByText('Recebido em planos')).toBeVisible();
  await expect(page.getByRole('table', { name: 'Pagamentos' })).toBeVisible();

  await page.getByLabel('Status').selectOption('APROVADO');
  await page.getByRole('button', { name: 'Filtrar pagamentos' }).click();
  await expect(page).toHaveURL(/status=APROVADO/);
  const rows = page.getByRole('table', { name: 'Pagamentos' }).getByRole('row');
  await expect(rows.nth(1)).toContainText('Aprovado');
  await expect(rows.filter({ hasText: 'Pendente' })).toHaveCount(0);

  await page.getByRole('navigation', { name: 'Período' }).getByRole('link', { name: '7 dias' }).click();
  await expect(page).toHaveURL(/period=7d/);
  await expect(page).toHaveURL(/status=APROVADO/);
  await expect(page.getByRole('link', { name: '7 dias' })).toHaveAttribute('aria-current', 'page');
  await print(page, 'financeiro');
});
