import { test, expect } from '@playwright/test';
import { internal, newCustomer, print, run, tenantId } from './helpers';

test('inbox: mensagem chega em tempo real nas duas abas e o status muda', async ({ page, context, request }) => {
  await page.goto('/inbox');
  const tenant = await tenantId(page);
  const customer = await newCustomer(page, `Inbox E2E ${run}`);
  const conv = await internal(request, tenant, '/conversations', {
    customerId: customer.id,
    channel: 'WHATSAPP',
  });

  const other = await context.newPage();
  const sockets = [page.waitForEvent('websocket'), other.waitForEvent('websocket')];
  await page.reload();
  await other.goto('/inbox');
  await Promise.all(sockets);

  await page.getByRole('button', { name: new RegExp(customer.name) }).click();
  const log = page.getByRole('log');
  await expect(log.getByText('Nenhuma mensagem nesta conversa.')).toBeVisible();

  // O handshake do socket termina antes de a API pôr a conexão na sala do tenant
  // e nada sinaliza essa entrada; reenviar até a primeira mensagem chegar troca a espera fixa.
  let text = '';
  let attempt = 0;
  await expect(async () => {
    text = `Tem horário hoje? ${run}-${++attempt}`;
    await internal(request, tenant, `/conversations/${conv.id}/messages`, {
      content: text,
      direction: 'INBOUND',
      channel: 'WHATSAPP',
    });
    await expect(log.getByText(text)).toBeVisible({ timeout: 2_000 });
  }).toPass({ timeout: 15_000 });
  await expect(other.getByRole('button', { name: new RegExp(customer.name) })).toContainText(text, { timeout: 10_000 });
  await expect(other.getByRole('button', { name: new RegExp(customer.name) })).toContainText('Aguardando resposta');

  await page.getByLabel('Status da conversa').selectOption('EM_ATENDIMENTO');
  await expect(page.getByRole('status').filter({ hasText: 'Conversa marcada como em atendimento.' })).toBeVisible();
  await expect(other.getByRole('button', { name: new RegExp(customer.name) })).toContainText('em atendimento', {
    timeout: 10_000,
  });

  // Sem Evolution configurada o envio falha: o erro aparece e o texto fica.
  await page.getByRole('textbox', { name: 'Mensagem' }).fill('Temos sim');
  await page.getByRole('button', { name: 'Enviar mensagem' }).click();
  await expect(page.getByRole('alert').filter({ hasText: 'Mensagem não enviada' })).toBeVisible();
  await expect(page.getByRole('textbox', { name: 'Mensagem' })).toHaveValue('Temos sim');
  await print(page, 'inbox');
  await other.close();
});
