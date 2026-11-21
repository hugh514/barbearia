import path from 'node:path';
import { expect, test, type Page } from '@playwright/test';
import { SLUG, enterQueue, finishService, clearQueue, newClient, signIn, startService } from './helpers';

// Só com PRINTS=1 (ver playwright.config.ts). Grava em docs/prints/cliente.
const OUT = path.resolve(__dirname, '../../../docs/prints/cliente');
const SIZES = [
  ['celular', { width: 390, height: 844 }],
  ['desktop', { width: 1280, height: 800 }],
] as const;

// url: telas que mudam a própria URL ao abrir (a de senha nova tira o token) não aguentam reload.
async function shoot(page: Page, name: string, ready: () => Promise<unknown>, url?: string) {
  for (const [label, size] of SIZES) {
    await page.setViewportSize(size);
    await (url ? page.goto(url) : page.reload());
    await ready();
    await page.screenshot({ path: path.join(OUT, `${name}-${label}.png`), fullPage: true });
  }
}

test('prints das telas de entrada', async ({ page }) => {
  await page.goto(`/login?b=${SLUG}`);
  await shoot(page, 'login', () => expect(page.getByRole('button', { name: 'Entrar' })).toBeVisible());
  await page.goto(`/cadastro?b=${SLUG}`);
  await shoot(page, 'cadastro', () => expect(page.getByRole('button', { name: 'Criar conta' })).toBeVisible());
  await page.goto(`/forgot-password?b=${SLUG}`);
  await shoot(page, 'esqueci-senha', () => expect(page.getByRole('button', { name: 'Enviar link' })).toBeVisible());
  await shoot(
    page,
    'nova-senha',
    () => expect(page.getByRole('button', { name: 'Salvar senha nova' })).toBeVisible(),
    `/reset-password?token=exemplo&tenant=${SLUG}`,
  );
});

test('prints da home, planos, histórico e perfil', async ({ page, context }) => {
  const c = await newClient('Rafael Souza');
  await signIn(context, c);

  await page.goto('/');
  await shoot(page, 'home-sem-fila', () => expect(page.getByText('Chegou na barbearia?')).toBeVisible());

  await clearQueue();
  const frente = await enterQueue(await newClient('Na Frente'));
  const id = await enterQueue(c);
  await page.goto('/');
  await shoot(page, 'home-senha', () => expect(page.getByText(/na sua frente/)).toBeVisible());

  await startService(frente);
  await page.goto('/');
  await shoot(page, 'home-proximo', () => expect(page.getByText('Você é o próximo')).toBeVisible());
  await finishService(frente, 30);

  await startService(id);
  await page.goto('/');
  await shoot(page, 'home-cadeira', () => expect(page.getByText('cadeira', { exact: true })).toBeVisible());
  await finishService(id, 45);

  await page.goto('/planos');
  await shoot(page, 'planos', () => expect(page.getByRole('button', { name: /^Assinar / }).first()).toBeVisible());

  await page.getByRole('button', { name: /^Assinar / }).first().click();
  await expect(page.getByRole('img', { name: 'QR do PIX' })).toBeVisible();
  for (const [label, size] of SIZES) {
    await page.setViewportSize(size);
    await page.screenshot({ path: path.join(OUT, `planos-pix-${label}.png`), fullPage: true });
  }
  await page.getByRole('button', { name: 'Simular pagamento (dev)' }).click();
  await expect(page.getByText(/Pagamento confirmado/)).toBeVisible({ timeout: 30_000 });
  for (const [label, size] of SIZES) {
    await page.setViewportSize(size);
    await page.screenshot({ path: path.join(OUT, `planos-ativo-${label}.png`), fullPage: true });
  }

  await page.goto('/');
  await shoot(page, 'home-plano-ativo', () => expect(page.getByText('Ativo', { exact: true })).toBeVisible());
  await page.goto('/historico');
  await shoot(page, 'historico', () => expect(page.getByText('R$ 45,00')).toBeVisible());
  await page.goto('/perfil');
  await shoot(page, 'perfil', () => expect(page.getByText(c.email)).toBeVisible());
});
