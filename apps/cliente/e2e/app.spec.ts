import { expect, test } from '@playwright/test';
import { enterQueue, finishService, clearQueue, newClient, signIn, startService, suspendedPlan } from './helpers';

test.describe('Home e plano', () => {
  test('sem fila, o QR de entrada é a peça central', async ({ page, context }) => {
    await signIn(context, await newClient('Sem Fila'));
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'Olá, Sem' })).toBeVisible();
    const fila = page.getByRole('region', { name: 'Sua vez na fila' });
    await expect(fila.getByText('Chegou na barbearia?')).toBeVisible();
    await fila.getByRole('button', { name: 'Mostrar QR de entrada' }).click();
    await expect(page.getByRole('dialog', { name: 'Mostre na recepção' })).toBeVisible();
    await expect(page.getByRole('img', { name: 'QR de check-in' })).toBeVisible();
  });

  test('na fila mostra a senha e, na cadeira, avisa sozinha', async ({ page, context }) => {
    await clearQueue();
    const frente = await enterQueue(await newClient('Na Frente'));
    const c = await newClient('Na Fila');
    const appointmentId = await enterQueue(c);
    await signIn(context, c);
    await page.goto('/');

    const fila = page.getByRole('region', { name: 'Sua vez na fila' });
    const senha = fila.getByTestId('senha');
    await expect(senha).toHaveAttribute('aria-live', 'polite');
    await expect(senha).toContainText(/Você é o \d+º da fila/);
    await expect(senha.getByText(/^\d+ na sua frente$/)).toBeVisible();
    await expect(page.getByRole('button', { name: 'Mostrar QR de entrada' })).toBeVisible();

    // Sem recarregar: a home consulta a fila a cada 10 s.
    await startService(frente);
    await expect(senha.getByText('Você é o próximo')).toBeVisible({ timeout: 20_000 });
    await finishService(frente, 30);

    await startService(appointmentId);
    await expect(senha).toContainText('Você está na cadeira', { timeout: 20_000 });
    await expect(senha.getByText('cadeira', { exact: true })).toBeVisible();

    await finishService(appointmentId, 45);
    await page.goto('/historico');
    const item = page.getByRole('listitem').first();
    await expect(item).toContainText('Corte');
    await expect(item).toContainText('R$ 45,00');
    await expect(item).toContainText(/agora|há \d+ min/);
  });

  test('assina com PIX, retoma o pagamento, simula e cancela', async ({ page, context }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    await signIn(context, await newClient('Assina Plano'));
    await page.goto('/planos');

    await page.getByRole('button', { name: /^Assinar / }).first().click();
    await expect(page.getByRole('img', { name: 'QR do PIX' })).toBeVisible();
    const code = page.getByLabel('PIX copia e cola');
    await expect(code).toHaveValue(/MOCKPIX/);
    await expect(page.getByRole('status').filter({ hasText: 'Aguardando pagamento' })).toBeVisible();
    await page.getByRole('button', { name: 'Copiar código' }).click();
    await expect(page.getByRole('button', { name: 'Código copiado' })).toBeVisible();
    expect(await page.evaluate(() => navigator.clipboard.readText())).toMatch(/MOCKPIX/);

    // Saiu e voltou: a assinatura pendente retoma o mesmo PIX.
    const first = await code.inputValue();
    await page.reload();
    await expect(page.getByText('Aguardando pagamento').first()).toBeVisible();
    await page.getByRole('button', { name: 'Pagar com PIX' }).click();
    await expect(page.getByLabel('PIX copia e cola')).toHaveValue(first);

    await page.getByRole('button', { name: 'Simular pagamento (dev)' }).click();
    await expect(page.getByText(/Pagamento confirmado\. .+ está ativo\./)).toBeVisible({
      timeout: 30_000,
    });
    await expect(page.getByText('Ativo', { exact: true })).toBeVisible();

    await page.goto('/');
    await expect(page.getByText('Ativo', { exact: true })).toBeVisible();

    await page.goto('/planos');
    await page.getByRole('button', { name: 'Cancelar assinatura' }).click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toContainText('Os benefícios param na hora');
    // A saída segura vem primeiro e recebe o foco.
    await expect(dialog.getByRole('button', { name: 'Manter plano' })).toBeFocused();
    await dialog.getByRole('button', { name: 'Manter plano' }).click();
    await expect(dialog).toHaveCount(0);

    await page.getByRole('button', { name: 'Cancelar assinatura' }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Cancelar assinatura' }).click();
    await expect(page.getByRole('status').filter({ hasText: 'Assinatura cancelada.' })).toBeVisible();
    await expect(page.getByRole('button', { name: /^Assinar / }).first()).toBeVisible();
  });

  test('plano suspenso por atraso fica como atual e reativa pelo PIX', async ({ page, context }) => {
    const c = await newClient('Plano Atrasado');
    const { subscriptionId, paidPixId } = await suspendedPlan(c);
    await signIn(context, c);
    // O aparelho ainda guarda o PIX do ciclo passado, já pago: não pode prender a tela nele.
    await context.addInitScript(
      ([sub, pix]) => {
        if (!localStorage.getItem('bc_pix')) localStorage.setItem('bc_pix', JSON.stringify({ [sub]: pix }));
      },
      [subscriptionId, paidPixId],
    );

    await page.goto('/');
    await expect(page.getByText('Pagamento atrasado')).toBeVisible();
    await page.getByRole('link', { name: 'Pagar com PIX para reativar' }).click();

    await expect(page).toHaveURL(/\/planos$/);
    await expect(page.getByText('Pagamento atrasado')).toBeVisible();
    await expect(page.getByText('Pague por PIX para reativar o plano.')).toBeVisible();
    await expect(page.getByRole('button', { name: /^Assinar / })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Cancelar assinatura' })).toBeVisible();

    await page.getByRole('button', { name: 'Pagar com PIX' }).click();
    await expect(page.getByLabel('PIX copia e cola')).toHaveValue(/MOCKPIX/);
    await expect(page.getByRole('status').filter({ hasText: 'Aguardando pagamento' })).toBeVisible();
    await page.getByRole('button', { name: 'Simular pagamento (dev)' }).click();
    await expect(page.getByText(/Pagamento confirmado\. .+ está ativo\./)).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText('Ativo', { exact: true })).toBeVisible();
    expect(await page.evaluate(() => localStorage.getItem('bc_pix'))).toBe('{}');
  });
});
