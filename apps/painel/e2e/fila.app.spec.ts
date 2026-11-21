import { test, expect, type Page } from '@playwright/test';

const unique = () => Date.now().toString().slice(-8);

/** O admin só pode ter um atendimento na cadeira: finaliza o que sobrou de outro teste. */
async function freeAdminChair(page: Page) {
  const me = await (await page.request.get('/api/auth/me')).json();
  const queue = await (await page.request.get('/api/appointments/queue')).json();
  for (const a of queue.data) {
    if (a.status === 'EM_ATENDIMENTO' && a.barberId === me.id) {
      await page.request.patch(`/api/appointments/${a.id}/finish`, { data: {} });
    }
  }
}

async function arriveNewCustomer(page: Page, name: string, phone: string) {
  await page.getByRole('button', { name: 'Cliente chegou' }).click();
  const dialog = page.getByRole('dialog', { name: 'Cliente chegou' });
  await dialog.getByLabel('Buscar cliente').fill(name);
  await dialog.getByRole('button', { name: 'Cadastrar cliente novo' }).click();
  await expect(dialog.getByLabel('Nome')).toHaveValue(name);
  await dialog.getByLabel('Telefone').fill(phone);
  await dialog.getByRole('button', { name: 'Cadastrar e pôr na fila' }).click();
  await expect(page.getByText(`${name} entrou na fila.`)).toBeVisible();
  await expect(dialog).toBeHidden();
}

test('fila: Cliente chegou, iniciar, finalizar e conferir em Feitos', async ({ page }) => {
  await freeAdminChair(page);
  const id = unique();
  const name = `Teste Fila ${id}`;
  await page.goto('/fila');
  await arriveNewCustomer(page, name, `119${id}`);

  const waiting = page.locator('#panel-waiting');
  const card = waiting.getByRole('listitem').filter({ hasText: name });
  await expect(card).toContainText(/agora|há \d+ min/);
  await card.getByRole('button', { name: /^Iniciar atendimento/ }).click();
  await expect(page.getByText('Atendimento iniciado.')).toBeVisible();

  const chair = page.locator('#panel-chair').getByRole('listitem').filter({ hasText: name });
  await expect(chair).toContainText(/Na cadeira há/);
  await chair.getByRole('button', { name: 'Finalizar atendimento' }).click();

  const finish = page.getByRole('dialog', { name: 'Finalizar atendimento' });
  await finish.getByLabel('Valor total').fill('4500');
  await expect(finish.getByLabel('Valor total')).toHaveValue(/R\$\s45,00/);
  await finish.getByRole('button', { name: 'Finalizar' }).click();
  await expect(page.getByText('Atendimento finalizado.')).toBeVisible();

  const done = page.getByRole('list', { name: 'Atendimentos feitos hoje' }).getByRole('listitem').filter({ hasText: name });
  await expect(done).toContainText(/R\$\s45,00/);
});

test('fila: cliente que já está na fila não entra de novo', async ({ page }) => {
  const id = unique();
  const name = `Teste Duplo ${id}`;
  await page.goto('/fila');
  await arriveNewCustomer(page, name, `118${id}`);

  await page.getByRole('button', { name: 'Cliente chegou' }).click();
  const dialog = page.getByRole('dialog', { name: 'Cliente chegou' });
  await dialog.getByLabel('Buscar cliente').fill(name);
  const found = dialog.getByRole('button', { name: `${name}, já está na fila` });
  await expect(found).toBeDisabled();
  await page.keyboard.press('Escape');

  const card = page.locator('#panel-waiting').getByRole('listitem').filter({ hasText: name });
  await card.getByRole('button', { name: `Cancelar atendimento de ${name}` }).click();
  await page.getByRole('dialog', { name: 'Cancelar atendimento?' }).getByRole('button', { name: 'Cancelar atendimento' }).click();
  await expect(page.getByText('Atendimento cancelado.')).toBeVisible();
  await expect(
    page.getByRole('list', { name: 'Atendimentos feitos hoje' }).getByRole('listitem').filter({ hasText: name }),
  ).toContainText('Cancelado');
});

test('fila: Esperando em linhas compactas, só o primeiro com o botão cheio', async ({ page }) => {
  const id = unique();
  for (const n of [1, 2]) {
    const customer = await page.request.post('/api/customers', { data: { name: `Compacto ${n} ${id}`, phone: `116${n}${id}` } });
    expect(customer.ok()).toBeTruthy();
    const appt = await page.request.post('/api/appointments', { data: { customerId: (await customer.json()).id } });
    expect(appt.ok()).toBeTruthy();
  }
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto('/fila');
  const rows = page.locator('#panel-waiting').getByRole('listitem');
  const last = rows.filter({ hasText: `Compacto 2 ${id}` });
  await expect(last).toBeVisible();
  await expect(rows.first().getByText('Iniciar atendimento', { exact: true })).toBeVisible();
  await expect(rows.getByText('Iniciar atendimento', { exact: true })).toHaveCount(1);
  await expect(rows.first().getByRole('button', { name: /^Iniciar atendimento de / })).toBeVisible();

  await expect(last).toContainText(/agora|há \d+ min/);
  await expect(last.getByRole('button', { name: `Iniciar atendimento de Compacto 2 ${id}` })).toBeVisible();
  await expect(last.getByRole('button', { name: `Cancelar atendimento de Compacto 2 ${id}` })).toBeVisible();
  expect((await last.boundingBox())?.height ?? 0).toBeLessThanOrEqual(64);
});

test('sidebar ocupa a altura toda e fica fixa ao rolar página longa', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 600 });
  await page.goto('/fila');
  const docHeight = await page.evaluate(() => document.documentElement.scrollHeight);
  const column = page.getByTestId('sidebar-coluna');
  expect((await column.boundingBox())?.height ?? 0).toBeGreaterThanOrEqual(docHeight - 1);
  await page.mouse.wheel(0, 2000);
  await expect(page.getByRole('navigation', { name: 'Principal' }).getByRole('link', { name: 'Clientes' })).toBeInViewport();
});

test('fila no celular: colunas viram abas com alvos de 44px e sem rolagem lateral', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/fila');
  const tabs = page.getByRole('tablist', { name: 'Colunas da fila' });
  await expect(tabs).toBeVisible();

  const chegou = await page.getByRole('button', { name: 'Cliente chegou' }).boundingBox();
  expect(chegou?.height ?? 0).toBeGreaterThanOrEqual(44);

  await tabs.getByRole('tab', { name: /Feitos/ }).click();
  await expect(tabs.getByRole('tab', { name: /Feitos/ })).toHaveAttribute('aria-selected', 'true');
  await expect(page.locator('#panel-done')).toBeVisible();
  await expect(page.locator('#panel-waiting')).toBeHidden();
  await expect(page.getByRole('list', { name: 'Atendimentos feitos hoje' })).toBeVisible();

  await tabs.getByRole('tab', { name: /Feitos/ }).press('ArrowLeft');
  await expect(tabs.getByRole('tab', { name: /Na cadeira/ })).toBeFocused();
  await expect(page.locator('#panel-chair')).toBeVisible();

  await tabs.getByRole('tab', { name: /Esperando/ }).click();
  const start = page.locator('#panel-waiting').getByRole('button', { name: 'Iniciar atendimento' }).first();
  if (await start.count()) {
    expect((await start.boundingBox())?.height ?? 0).toBeGreaterThanOrEqual(44);
  }
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
});

test('clientes: busca vai para a URL e o detalhe salva a edição', async ({ page }) => {
  const id = unique();
  const name = `Teste Edicao ${id}`;
  const created = await page.request.post('/api/customers', {
    data: { name, phone: `117${id}` },
  });
  expect(created.ok()).toBeTruthy();

  await page.goto('/clientes');
  await page.getByLabel('Buscar clientes').fill(name);
  await expect(page).toHaveURL(new RegExp(`q=Teste\\+Edicao\\+${id}`));
  await page.getByRole('link', { name }).click();
  await expect(page.getByRole('heading', { level: 1, name })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Atendimentos' })).toBeVisible();

  const novo = `${name} Silva`;
  await page.getByLabel('Nome').fill(novo);
  await page.getByRole('button', { name: 'Salvar dados' }).click();
  await expect(page.getByText('Dados do cliente salvos.')).toBeVisible();
  await page.reload();
  await expect(page.getByRole('heading', { level: 1, name: novo })).toBeVisible();

  await page.getByRole('link', { name: 'Voltar para Clientes' }).click();
  await expect(page).toHaveURL(/\/clientes$/);
});

test('equipe: editar e desativar com confirmação, sem desativar a si mesmo', async ({ page }) => {
  const id = unique();
  const name = `Barbeiro Teste ${id} com um nome comprido que precisa caber na tabela`;
  const created = await page.request.post('/api/users', {
    data: { name, email: `e2e.${id}@barbearia.example`, password: 'Senha1234', role: 'BARBEIRO' },
  });
  expect(created.ok()).toBeTruthy();

  await page.goto('/barbeiros');
  const ativos = page.getByRole('table', { name: 'Membros ativos' });
  await expect(ativos.getByRole('row', { name: /Administrador Demo/ }).getByRole('button', { name: /Desativar/ })).toHaveCount(0);

  await ativos.getByRole('button', { name: `Editar ${name}` }).click();
  const edit = page.getByRole('dialog', { name: 'Editar membro' });
  await edit.getByLabel('Papel').selectOption('GERENTE');
  await edit.getByRole('button', { name: 'Salvar alterações' }).click();
  await expect(page.getByText('Alterações salvas.')).toBeVisible();
  await expect(ativos.getByRole('row', { name: new RegExp(`Barbeiro Teste ${id}`) })).toContainText('Gerente');

  await ativos.getByRole('button', { name: `Desativar ${name}` }).click();
  const confirm = page.getByRole('dialog', { name: /^Desativar Barbeiro Teste/ });
  await confirm.getByRole('button', { name: 'Desativar membro' }).click();
  await expect(page.getByText(`${name} foi desativado.`)).toBeVisible();
  await expect(page.getByRole('table', { name: 'Membros desativados' })).toContainText(`Barbeiro Teste ${id}`);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(1280);
});
