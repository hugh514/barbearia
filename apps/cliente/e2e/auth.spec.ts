import { expect, test } from '@playwright/test';
import { BASE, PASSWORD, SLUG, newClient, resetTokenFor, uniqueEmail } from './helpers';

test.describe('Entrada', () => {
  test('login com from externo cai na home, não em outro site', async ({ page }) => {
    await page.goto(`/login?b=${SLUG}&from=${encodeURIComponent('/..//evil.example')}`);

    await expect(page.getByText('Entre para ver sua vez na fila e seu plano.')).toBeVisible();
    await expect(page.getByRole('link', { name: 'Esqueci a senha' })).toHaveAttribute(
      'href',
      `/forgot-password?b=${SLUG}`,
    );
    await expect(page.getByRole('link', { name: 'Criar conta' })).toHaveAttribute('href', `/cadastro?b=${SLUG}`);

    const senha = page.getByLabel('Senha', { exact: true });
    await senha.fill('Cliente123');
    await expect(senha).toHaveAttribute('type', 'password');
    await page.getByRole('button', { name: 'Mostrar senha' }).click();
    await expect(senha).toHaveAttribute('type', 'text');
    await page.getByRole('button', { name: 'Ocultar senha' }).click();
    await expect(senha).toHaveAttribute('type', 'password');

    await page.getByLabel('E-mail').fill('cliente@barbearia.example');
    await page.getByRole('button', { name: 'Entrar' }).click();
    await expect(page).toHaveURL(`${BASE}/`);
    await expect(page.getByRole('region', { name: 'Sua vez na fila' })).toBeVisible();
  });

  test('login errado mostra o erro com role=alert', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel('E-mail').fill('ninguem@cliente.example');
    await page.getByLabel('Senha', { exact: true }).fill('Errada123');
    await page.getByRole('button', { name: 'Entrar' }).click();
    await expect(page.locator('form [role=alert]')).toBeVisible();
    await expect(page).toHaveURL(/\/login/);
  });

  test('o limite de tentativas da API é por pessoa, não pelo servidor do Next', async ({ request }) => {
    const octet = () => Math.floor(Math.random() * 250) + 2;
    const loginFrom = (ip: string) =>
      request.post('/api/auth/login', {
        headers: { 'x-forwarded-for': ip },
        data: { email: 'ninguem@cliente.example', password: 'Errada123', tenantSlug: SLUG },
      });
    const quem = `10.200.${octet()}.${octet()}`;
    for (let i = 0; i < 5; i++) expect((await loginFrom(quem)).status()).toBe(401);
    expect((await loginFrom(quem)).status()).toBe(429);
    expect((await loginFrom(`10.201.${octet()}.${octet()}`)).status()).toBe(401);
  });

  test('cadastro usa a barbearia do ?b= sem campo de texto livre', async ({ page }) => {
    // Link quebrado não cai em outra barbearia
    await page.goto('/cadastro?b=Link%20Quebrado');
    await expect(page.getByText('Este link de cadastro não é válido.')).toBeVisible();
    await expect(page.getByLabel('Nome')).toHaveCount(0);

    await page.goto(`/cadastro?b=${SLUG}`);
    await expect(page.getByLabel('Barbearia')).toHaveCount(0);
    await expect(page.getByRole('link', { name: 'Entrar' })).toHaveAttribute('href', `/login?b=${SLUG}`);

    await page.getByLabel('Nome').fill('Cadastro Pelo Link');
    await page.getByLabel('Telefone').fill(`1198${Date.now().toString().slice(-7)}`);
    await page.getByLabel('E-mail').fill(uniqueEmail('cadastro'));
    await page.getByLabel('Senha', { exact: true }).fill(PASSWORD);
    await page.getByRole('button', { name: 'Criar conta' }).click();

    await expect(page).toHaveURL(`${BASE}/`);
    await expect(page.getByRole('heading', { name: 'Olá, Cadastro' })).toBeVisible();
  });

  test('esqueci a senha e troca pelo link', async ({ page }) => {
    const c = await newClient('Troca Senha');

    await page.goto(`/login?b=${SLUG}`);
    await page.getByRole('link', { name: 'Esqueci a senha' }).click();
    await expect(page).toHaveURL(`${BASE}/forgot-password?b=${SLUG}`);
    await page.getByLabel('E-mail').fill(c.email);
    await page.getByRole('button', { name: 'Enviar link' }).click();
    await expect(page.getByRole('status')).toContainText('Se houver uma conta com esse e-mail');

    // O e-mail de dev não leva o link: o token gerado pela API é lido no Redis dela.
    await expect.poll(() => resetTokenFor(c.userId), { timeout: 10_000 }).not.toBeNull();
    const token = resetTokenFor(c.userId)!;

    await page.goto(`/reset-password?token=${token}&tenant=${SLUG}`);
    // O token sai da barra de endereço assim que a tela abre.
    await expect(page).toHaveURL(`${BASE}/reset-password?tenant=${SLUG}`);
    await page.getByLabel('Senha nova', { exact: true }).fill('Trocada123');
    await page.getByLabel('Repita a senha nova').fill('Trocada124');
    await page.getByRole('button', { name: 'Salvar senha nova' }).click();
    await expect(page.getByText('As senhas não são iguais')).toBeVisible();
    await expect(page.getByLabel('Repita a senha nova')).toHaveAccessibleDescription('As senhas não são iguais');

    await page.getByLabel('Repita a senha nova').fill('Trocada123');
    await page.getByRole('button', { name: 'Salvar senha nova' }).click();
    await expect(page).toHaveURL(`${BASE}/login?reset=1&b=${SLUG}`);
    await expect(page.getByRole('status')).toContainText('Senha trocada');

    await page.getByLabel('E-mail').fill(c.email);
    await page.getByLabel('Senha', { exact: true }).fill('Trocada123');
    await page.getByRole('button', { name: 'Entrar' }).click();
    await expect(page).toHaveURL(`${BASE}/`);

    // Já usado, o link não vale de novo.
    await page.goto(`/reset-password?token=${token}&tenant=${SLUG}`);
    await page.getByLabel('Senha nova', { exact: true }).fill('Outra1234');
    await page.getByLabel('Repita a senha nova').fill('Outra1234');
    await page.getByRole('button', { name: 'Salvar senha nova' }).click();
    await expect(page.getByRole('alert').filter({ hasText: 'Link vencido ou já usado' })).toBeVisible();

    // Logado, um link novo troca a senha e encerra a sessão deste aparelho.
    await page.goto(`/forgot-password?b=${SLUG}`);
    await page.getByLabel('E-mail').fill(c.email);
    await page.getByRole('button', { name: 'Enviar link' }).click();
    await expect.poll(() => resetTokenFor(c.userId), { timeout: 10_000 }).not.toBeNull();
    await page.goto(`/reset-password?token=${resetTokenFor(c.userId)}&tenant=${SLUG}`);
    await page.getByLabel('Senha nova', { exact: true }).fill('Outra1234');
    await page.getByLabel('Repita a senha nova').fill('Outra1234');
    await page.getByRole('button', { name: 'Salvar senha nova' }).click();
    await expect(page).toHaveURL(`${BASE}/login?reset=saiu&b=${SLUG}`);
    await expect(page.getByRole('status')).toContainText('Você saiu da conta neste aparelho');
    await page.goto('/');
    await expect(page).toHaveURL(/\/login/);
  });
});
