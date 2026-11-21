# API

API NestJS que concentra toda a regra de negócio da barbearia. O painel, o app do cliente, os webhooks de WhatsApp, Instagram e Mercado Pago e a IA falam só com ela. Cada barbearia é um tenant, e todo dado é filtrado pelo `tenantId` que vem no token.

O jeito mais fácil de rodar é pelo `docker compose up --build` na raiz do repositório. Para rodar só a API na sua máquina, com Postgres e Redis do compose no ar:

```bash
cp .env.example .env
npm install
npx prisma migrate deploy
npm run prisma:seed
npm run start:dev
```

A API fica em http://localhost:3000, com Swagger em `/docs` e saúde em `/health`.

## Testes

```bash
npm test            # unitários
npm run test:e2e    # um arquivo por feature em test/, precisa de Postgres e Redis
npm run lint
```

O seed usa telefones fixos para os clientes de demonstração. Em um banco criado por versão anterior do seed, rodar o seed de novo duplica esses clientes: suba do zero com `docker compose down -v`.

## Onde está cada coisa

- `src/modules`: um módulo por assunto (auth, customers, appointments, plans, subscriptions, payments, conversations, whatsapp, instagram, ai, checkin, dashboard).
- `src/queue` e `src/events`: jobs do BullMQ e contratos de eventos.
- `prisma/`: schema, migrations e o seed com dados de exemplo.
- `specs/`: o que foi pedido em cada feature e como foi feito.

## Contratos e variáveis da feature 014 (lacunas)

Variáveis novas (todas opcionais em dev):

| Variável | Padrão | Para que serve |
|---|---|---|
| `PAYMENTS_PROVIDER` | `mock` com o token falso do `.env.example`, senão `mercadopago` | `mock` devolve PIX fictício e habilita `mock-approve`. Recusado com `NODE_ENV=production`. |
| `PAINEL_PUBLIC_URL` | `http://localhost:3001` | Base dos links de e-mail para a equipe. Em produção é obrigatória, https e não local. |
| `CLIENTE_PUBLIC_URL` | `http://localhost:3002` | Base dos links de e-mail para clientes. Mesmas regras. |
| `EMAIL_PROVIDER` | `log` | `log` (dev e teste) ou `smtp`. Produção recusa `log`. O `smtp` ainda não está implementado e faz a API falhar no boot: produção só sobe depois que `EmailSender` for implementado. |
| `TRUST_PROXY` | `false` | O rate limit usa `req.ip`. Só com proxy confiável à frente (ex.: `1` salto) o `X-Forwarded-For` passa a valer. Aceita `false`, `true` ou um número >= 1; outro valor é recusado. Em produção é obrigatório definir e `true` é recusado. Os e2e usam `true`. |

Em produção a API também recusa subir com `INSTAGRAM_VERIFY_TOKEN` e token do Mercado Pago de desenvolvimento, `DATABASE_URL` com `barber:barber` e `ALLOWED_ORIGINS` com qualquer origem localhost, 127.0.0.1 ou `*`.

Endpoints:

- `GET /appointments/queue` (ADMIN, GERENTE, BARBEIRO): sem parâmetro, só AGUARDANDO e EM_ATENDIMENTO de hoje. Com `?include=finished`, soma FINALIZADO e CANCELADO de hoje. Todo item traz `enteredAt` (igual a `createdAt`, hora de entrada), `startedAt` e `finishedAt`.
- `GET /appointments/me/queue` (CLIENTE): `{ position, ahead, status, enteredAt }`. `position` 1 é o próximo, 0 é quem está em atendimento, `ahead` conta quem aguarda na frente. Fora da fila hoje, os quatro campos vêm `null`. 422 se o usuário não tem cliente vinculado.
- `POST /payments/:id/mock-approve` (ADMIN, GERENTE, CLIENTE dono): só com provedor mock e fora de produção; aprova pelo mesmo caminho do webhook e a assinatura é ativada pela fila. Fora disso responde 404.
- `GET /channels/config` (equipe e CLIENTE) e `PATCH /channels/config` (só ADMIN) ganham `brandColor` (`#RRGGBB`, padrão `#1F4FB8`) e `themeMode` (`light` ou `dark`, padrão `light`). O CLIENTE recebe só `{ businessName, address, workingHours, services, brandColor, themeMode }` e, sem config no tenant, os padrões. Para a equipe, tenant sem config segue 404 (o painel depende disso para criar a config).
- `GET /channels/config/appearance` (qualquer papel autenticado): `{ businessName, brandColor, themeMode }` do próprio tenant, com `businessName: null` e os padrões quando não há config. É o endpoint para o layout dos fronts.
- `GET /queues/:name/failed` (ADMIN) só lista jobs falhados cujo `data.tenantId` é o do token. Os contadores de `/queues/stats` continuam globais.
- `POST /auth/forgot-password` aceita `tenantSlug` opcional. Sem ele, cada usuário ativo com o e-mail (um por tenant) recebe o próprio link; com ele, só o do tenant informado. A resposta é sempre 202 genérica.
- Erro 429 do throttle: `{ statusCode: 429, message: "Muitas requisições. Tente novamente em instantes.", error: "Too Many Requests", ... }`.

Recuperação de senha: `POST /auth/forgot-password` emite `SENHA_RECUPERACAO_SOLICITADA`; o listener põe o job na fila `email` e o processor envia o link `<PAINEL|CLIENTE>_PUBLIC_URL/reset-password?token=...&tenant=<slug>` pelo provedor de e-mail (interface `EmailSender` em `src/modules/email`). Em dev e teste (`EMAIL_PROVIDER=log`) o provedor não envia nada e registra no log só o assunto, sem link, token nem destinatário. SMTP real não foi ligado porque não há biblioteca de e-mail instalada: para produção, implemente `EmailSender` e ligue em `createEmailSender` (`EmailModule`).

## Contratos da feature 016 (painel de gestão)

- `POST /subscriptions` aceita `activateNow` (boolean, opcional). Só vale para ADMIN e GERENTE: sem ele ou com `true` a assinatura nasce ATIVO (pagamento no balcão); com `false` nasce PENDENTE, para gerar o PIX em `POST /payments`. Para CLIENTE é ignorado (sempre PENDENTE).
- `PATCH /subscriptions/:id/manual/{activate|suspend|renew}` (ADMIN, GERENTE): as mesmas transições das rotas internas, pela equipe. 422 em transição inválida, 404 fora do tenant, 400 em ação desconhecida. As rotas `PATCH /subscriptions/:id/{activate|suspend|renew}` continuam só com `X-Internal-Key`.
- `GET /payments` e `GET /payments/:id` trazem `customer: { id, name }`. `GET /payments` aceita `method` (`PIX`, `CARD`, `BOLETO`).
- `GET /payments/totals` (ADMIN, GERENTE), mesmos filtros de `GET /payments` sem paginação: `{ count, totalCents, byStatus: [{ status, count, amountCents }] }`.
- Dashboard: período novo `7d` (hoje e os seis dias anteriores) em todos os `/dashboard/*`. `GET /dashboard/summary` ganha `previousTotalAppointments` (mesmo trecho do período anterior: ontem até a mesma hora, mês anterior até o mesmo dia) e `appointmentsByDay: [{ date: 'AAAA-MM-DD', count, revenue }]`, um item por dia do período no fuso do servidor (vazio para `year`). A chave de cache do summary passou a `dashboard:summary:v2`.
- O fuso vem de `TZ`; o compose usa `APP_TZ` (padrão `America/Sao_Paulo`) na API e no painel, para não herdar o `TZ` do shell. Os cortes de período e os dias de `appointmentsByDay` seguem esse fuso; em produção defina `TZ` igual nos dois.
