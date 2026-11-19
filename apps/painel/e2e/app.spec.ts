import { test, expect } from '@playwright/test';

// Usa a sessão salva em auth.setup.ts (storageState) — sem re-login por teste.

test('dashboard exibe os números do período', async ({ page }) => {
  await page.goto('/dashboard');
  await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
  await expect(page.getByText('Receita', { exact: true })).toBeVisible();
  await expect(page.getByText('Atendimentos', { exact: true })).toBeVisible();
});

test('lista de clientes carrega da API', async ({ page }) => {
  await page.goto('/clientes');
  await expect(page.getByRole('heading', { name: 'Clientes' })).toBeVisible();
  await expect(page.getByText(/página 1 de/i)).toBeVisible({ timeout: 10_000 });
});

test('busca de clientes filtra via API', async ({ page }) => {
  await page.goto('/clientes');
  await expect(page.getByText(/página 1 de/i)).toBeVisible({ timeout: 10_000 });
  await page.getByLabel('Buscar clientes').fill('Ana');
  await expect(page.getByText('Ana Costa')).toBeVisible({ timeout: 10_000 });
});

test('fila do dia mostra colunas de status', async ({ page }) => {
  await page.goto('/fila');
  await expect(page.getByRole('heading', { name: 'Fila de hoje' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Esperando' })).toBeVisible();
  await expect(
    page.getByRole('heading', { name: 'Na cadeira' }),
  ).toBeVisible();
});

test('planos carrega da API', async ({ page }) => {
  await page.goto('/planos');
  await expect(page.getByRole('heading', { name: 'Planos' })).toBeVisible();
  await expect(page.getByRole('button', { name: /novo plano/i })).toBeVisible();
});

test('financeiro exibe receita por período', async ({ page }) => {
  await page.goto('/financeiro');
  await expect(page.getByRole('heading', { name: 'Financeiro' })).toBeVisible();
  await expect(page.getByText('Receita total')).toBeVisible();
});

test('equipe (barbeiros) carrega usuários da API', async ({ page }) => {
  await page.goto('/barbeiros');
  await expect(page.getByRole('heading', { name: 'Equipe' })).toBeVisible();
  await expect(
    page.getByRole('main').getByText('admin@barbearia.example'),
  ).toBeVisible({ timeout: 10_000 });
});

test('inbox carrega conversas da API', async ({ page }) => {
  await page.goto('/inbox');
  await expect(page.getByRole('heading', { name: 'Inbox' })).toBeVisible();
  // painel de thread com estado vazio até selecionar
  await expect(page.getByText('Selecione uma conversa')).toBeVisible();
});

test('check-in mostra entrada de token e scanner', async ({ page }) => {
  await page.goto('/checkin');
  await expect(page.getByRole('heading', { name: 'Check-in' })).toBeVisible();
  await expect(page.getByLabel('Token manual')).toBeVisible();
  await expect(page.getByRole('button', { name: /validar/i })).toBeVisible();
});

test('check-in com token inválido mostra erro', async ({ page }) => {
  await page.goto('/checkin');
  await page.getByLabel('Token manual').fill('token-invalido-xyz');
  await page.getByRole('button', { name: /validar/i }).click();
  await expect(page.getByRole('alert')).toBeVisible({ timeout: 10_000 });
});

test('configurações carrega formulário da barbearia', async ({ page }) => {
  await page.goto('/configuracoes');
  await expect(
    page.getByRole('heading', { name: 'Configurações' }),
  ).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Dados da barbearia' })).toBeVisible();
  await expect(
    page.getByRole('button', { name: /salvar configurações/i }),
  ).toBeVisible();
});

test('sidebar mostra navegação do papel ADMIN', async ({ page }) => {
  await page.goto('/dashboard');
  await expect(page.getByRole('link', { name: 'Clientes' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Financeiro' })).toBeVisible();
});

test('gaveta do celular abre a navegação, tem alvos de 44px e fecha com Esc', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/fila');
  const menu = page.getByRole('button', { name: 'Abrir menu' });
  await menu.click();

  const drawer = page.getByRole('dialog');
  await expect(drawer).toBeVisible();
  const box = await drawer.getByRole('link', { name: 'Clientes' }).boundingBox();
  expect(box?.height ?? 0).toBeGreaterThanOrEqual(44);
  await expect(drawer.getByRole('link', { name: 'Fila de hoje' })).toHaveAttribute(
    'aria-current',
    'page',
  );

  await page.keyboard.press('Escape');
  await expect(drawer).toBeHidden();
  await expect(menu).toBeFocused();

  await menu.click();
  await page.getByRole('dialog').getByRole('link', { name: 'Clientes' }).click();
  await expect(page).toHaveURL(/\/clientes/);
  await expect(page.getByRole('dialog')).toBeHidden();
});

test('gaveta fecha sozinha ao passar para o desktop', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/fila');
  await page.getByRole('button', { name: 'Abrir menu' }).click();
  await expect(page.getByRole('dialog')).toBeVisible();

  await page.setViewportSize({ width: 1280, height: 800 });
  await expect(page.getByRole('dialog')).toBeHidden();
  expect(await page.evaluate(() => document.body.style.overflow)).toBe('');
});

test('aparência: trocar a cor, salvar e ver o tema aplicado no html', async ({ page }) => {
  const brand = () =>
    page.evaluate(() => document.documentElement.style.getPropertyValue('--brand'));

  await page.goto('/configuracoes');
  const salvar = page.getByRole('button', { name: 'Salvar aparência' });
  await expect(salvar).toBeEnabled();

  await page.getByText('Bordô', { exact: true }).click();
  await salvar.click();
  await expect(page.getByText('Aparência salva.')).toBeVisible();
  await page.reload();
  expect(await brand()).toBe('#6e1f2a');

  // Volta ao padrão para não afetar os outros testes.
  await page.getByText('Cobalto', { exact: true }).click();
  await page.getByRole('button', { name: 'Salvar aparência' }).click();
  await expect(page.getByText('Aparência salva.')).toBeVisible();
  await page.reload();
  expect(await brand()).toBe('#1f4fb8');
});

test('logout volta para login', async ({ page }) => {
  await page.goto('/dashboard');
  await page.getByRole('button', { name: /sair/i }).click();
  await expect(page).toHaveURL(/\/login/);
});
