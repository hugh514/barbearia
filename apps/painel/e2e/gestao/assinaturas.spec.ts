import { test, expect } from '@playwright/test';
import { api, newCustomer, print, row, run } from './helpers';

test.describe('assinaturas', () => {
  let planName: string;

  test.beforeEach(async ({ page }) => {
    await page.goto('/assinaturas');
    planName = `Plano E2E ${run}`;
    const plans = await api<{ data: { name: string; active: boolean }[] }>(page, 'GET', '/plans?perPage=100');
    if (!plans.data.some((p) => p.name === planName && p.active)) {
      await api(page, 'POST', '/plans', {
        name: planName,
        priceCents: 7500,
        intervalDays: 30,
        benefits: [],
      });
    }
  });

  test('cria com PIX, aprova o mock e a assinatura fica ativa; depois suspende e cancela', async ({ page }) => {
    const customer = await newCustomer(page, `Pix E2E ${run}`);
    await page.reload();
    await page.getByRole('button', { name: 'Nova assinatura' }).click();
    const dialog = page.getByRole('dialog', { name: 'Nova assinatura' });
    await dialog.getByLabel('Cliente').fill(customer.name);
    await dialog.getByRole('button', { name: new RegExp(customer.name) }).click();
    await dialog.getByLabel('Plano').selectOption({ label: `${planName}, R$ 75,00 a cada 30 dias` });
    await dialog.getByLabel(/Gerar PIX/).check();

    const created = page.waitForResponse((r) => r.url().endsWith('/api/payments') && r.request().method() === 'POST');
    await dialog.getByRole('button', { name: 'Criar e gerar PIX' }).click();
    const payment = await (await created).json();

    const pix = page.getByRole('dialog', { name: 'Cobrança por PIX' });
    await expect(pix.getByRole('img', { name: 'QR do PIX' })).toBeVisible();
    await expect(pix.getByLabel('PIX copia e cola')).toHaveValue(/MOCK/);
    await expect(pix.getByText('Aguardando o pagamento.')).toBeVisible();
    await print(page, 'assinaturas-pix');

    await api(page, 'POST', `/payments/${payment.id}/mock-approve`);
    await expect(pix.getByText(/Pagamento aprovado/)).toBeVisible({
      timeout: 15_000,
    });
    await pix.getByRole('button', { name: 'Concluir' }).click();

    await expect(async () => {
      await page.reload();
      await expect(row(page, customer.name).getByText('Ativa')).toBeVisible({
        timeout: 1_000,
      });
    }).toPass({ timeout: 20_000 });

    await page.getByRole('button', { name: `Suspender assinatura de ${customer.name}` }).click();
    await page
      .getByRole('dialog', { name: 'Suspender assinatura?' })
      .getByRole('button', { name: 'Suspender assinatura' })
      .click();
    await expect(page.getByRole('status').filter({ hasText: 'Assinatura suspensa.' })).toBeVisible();
    await expect(row(page, customer.name).getByText('Suspensa')).toBeVisible();

    await page.getByRole('button', { name: `Cancelar assinatura de ${customer.name}` }).click();
    await page
      .getByRole('dialog', { name: 'Cancelar assinatura?' })
      .getByRole('button', { name: 'Cancelar assinatura' })
      .click();
    await expect(row(page, customer.name).getByText('Cancelada', { exact: true })).toBeVisible();

    await page.getByRole('link', { name: 'Canceladas' }).click();
    await expect(page).toHaveURL(/status=CANCELADO/);
    await expect(row(page, customer.name)).toBeVisible();
    await expect(page.getByRole('row').filter({ hasText: 'Ativa' })).toHaveCount(0);
  });

  test('assinatura pendente é cobrada por PIX direto da lista', async ({ page }) => {
    const customer = await newCustomer(page, `Pendente E2E ${run}`);
    const plans = await api<{ data: { id: string; name: string }[] }>(page, 'GET', '/plans?active=true&perPage=100');
    const plan = plans.data.find((p) => p.name === planName)!;
    await api(page, 'POST', '/subscriptions', {
      customerId: customer.id,
      planId: plan.id,
      activateNow: false,
    });
    await page.goto('/assinaturas?status=PENDENTE');

    await page
      .getByRole('button', {
        name: `Cobrar por PIX a assinatura de ${customer.name}`,
      })
      .click();
    const pix = page.getByRole('dialog', { name: 'Cobrança por PIX' });
    await expect(pix.getByRole('img', { name: 'QR do PIX' })).toBeVisible();
    await pix.getByRole('button', { name: 'Fechar e acompanhar na lista' }).click();

    // Segunda vez reaproveita o PIX pendente em vez de dar 409.
    await page
      .getByRole('button', {
        name: `Cobrar por PIX a assinatura de ${customer.name}`,
      })
      .click();
    await expect(pix.getByLabel('PIX copia e cola')).toHaveValue(/MOCK/);
  });

  test('cria com pagamento no balcão já ativa e renova', async ({ page }) => {
    const customer = await newCustomer(page, `Balcao E2E ${run}`);
    await page.getByRole('button', { name: 'Nova assinatura' }).click();
    const dialog = page.getByRole('dialog', { name: 'Nova assinatura' });
    await dialog.getByLabel('Cliente').fill(customer.name);
    await dialog.getByRole('button', { name: new RegExp(customer.name) }).click();
    await dialog.getByLabel('Plano').selectOption({ label: `${planName}, R$ 75,00 a cada 30 dias` });
    await dialog.getByRole('button', { name: 'Criar assinatura' }).click();
    await expect(page.getByRole('status').filter({ hasText: 'Assinatura criada e ativa.' })).toBeVisible();
    await expect(row(page, customer.name).getByText('Ativa')).toBeVisible();

    const before = await row(page, customer.name).getByRole('cell').nth(3).innerText();
    await page.getByRole('button', { name: `Renovar assinatura de ${customer.name}` }).click();
    await page
      .getByRole('dialog', { name: 'Renovar assinatura?' })
      .getByRole('button', { name: 'Renovar assinatura' })
      .click();
    await expect(page.getByRole('status').filter({ hasText: 'Assinatura renovada.' })).toBeVisible();
    await expect(row(page, customer.name).getByRole('cell').nth(3)).not.toHaveText(before);
    await print(page, 'assinaturas');
  });
});
