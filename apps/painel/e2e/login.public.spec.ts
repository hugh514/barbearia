import { test, expect } from '@playwright/test';

test.describe('Login em duas colunas', () => {
  test('desktop mostra o painel da marca ao lado do formulário', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('/login');
    await expect(page.getByRole('heading', { name: 'Entrar' })).toBeVisible();
    await expect(page.getByText('Fila, clientes e planos da barbearia num lugar só.')).toBeVisible();
    await expect(page.getByText('Conexão segura')).toHaveCount(0);
    await expect(page.getByRole('link', { name: 'Esqueci a senha' })).toBeVisible();
  });

  test('celular esconde o painel da marca e cabe sem rolar de lado', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/login');
    await expect(page.getByText('Fila, clientes e planos da barbearia num lugar só.')).toBeHidden();
    await expect(page.getByRole('button', { name: 'Entrar' })).toBeVisible();
    const box = await page.getByRole('button', { name: 'Entrar' }).boundingBox();
    expect(box?.height ?? 0).toBeGreaterThanOrEqual(44);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
  });

  test('borda do campo usa o token de input (3:1), não a linha clara', async ({ page }) => {
    await page.goto('/login');
    const border = await page.getByLabel('E-mail').evaluate((el) => getComputedStyle(el).borderTopColor);
    expect(border).toBe('rgb(125, 134, 145)');
  });

  test('mostrar senha troca o tipo do campo', async ({ page }) => {
    await page.goto('/login');
    const senha = page.getByLabel('Senha', { exact: true });
    await senha.fill('segredo');
    await expect(senha).toHaveAttribute('type', 'password');
    await page.getByRole('button', { name: 'Mostrar senha' }).click();
    await expect(senha).toHaveAttribute('type', 'text');
  });

  test('from externo não leva para fora do painel depois do login', async ({ page }) => {
    await page.goto('/login?from=%2F%2Fevil.example%2Froubo');
    await page.getByLabel('E-mail').fill('admin@barbearia.example');
    await page.getByLabel('Senha', { exact: true }).fill('admin123');
    await page.getByRole('button', { name: 'Entrar' }).click();
    await expect(page).toHaveURL(/127\.0\.0\.1:\d+\/dashboard/);
  });

  test('esqueci a senha e nova senha seguem o mesmo molde', async ({ page }) => {
    await page.goto('/forgot-password');
    await expect(page.getByRole('heading', { name: 'Recuperar senha' })).toBeVisible();
    await page.goto('/reset-password');
    await expect(page.getByText('Este link não vale mais.', { exact: false })).toHaveAttribute('role', 'alert');
  });
});
