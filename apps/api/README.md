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
| `PAINEL_PUBLIC_URL` | `http://localhost:3001` | Base dos links de e-mail para a equipe. |
| `CLIENTE_PUBLIC_URL` | `http://localhost:3002` | Base dos links de e-mail para clientes. |

Em produção a API também recusa subir com `INSTAGRAM_VERIFY_TOKEN` e token do Mercado Pago de desenvolvimento, `DATABASE_URL` com `barber:barber` e `ALLOWED_ORIGINS` só com localhost, 127.0.0.1 ou `*`.

Endpoints:

- `GET /appointments/queue` (ADMIN, GERENTE, BARBEIRO): sem parâmetro, só AGUARDANDO e EM_ATENDIMENTO de hoje. Com `?include=finished`, soma FINALIZADO e CANCELADO de hoje. Todo item traz `enteredAt` (igual a `createdAt`, hora de entrada), `startedAt` e `finishedAt`.
- `GET /appointments/me/queue` (CLIENTE): `{ position, ahead, status, enteredAt }`. `position` 1 é o próximo, 0 é quem está em atendimento, `ahead` conta quem aguarda na frente. Fora da fila hoje, os quatro campos vêm `null`. 422 se o usuário não tem cliente vinculado.
- `POST /payments/:id/mock-approve` (ADMIN, GERENTE, CLIENTE dono): só com provedor mock e fora de produção; aprova pelo mesmo caminho do webhook e a assinatura é ativada pela fila. Fora disso responde 404.
- `GET /channels/config` (qualquer usuário autenticado do tenant) e `PATCH /channels/config` (só ADMIN) ganham `brandColor` (`#RRGGBB`, padrão `#1F4FB8`) e `themeMode` (`light` ou `dark`, padrão `light`). Cliente lê sem `whatsappInstance` e `instagramPageId`.
- Erro 429 do throttle: `{ statusCode: 429, message: "Muitas requisições. Tente novamente em instantes.", error: "Too Many Requests", ... }`.

Recuperação de senha: `POST /auth/forgot-password` emite `SENHA_RECUPERACAO_SOLICITADA`; o listener põe o job na fila `email` e o processor envia o link `<PAINEL|CLIENTE>_PUBLIC_URL/reset-password?token=...&tenant=<slug>` pelo provedor de e-mail (interface `EmailSender` em `src/modules/email`). Em dev e teste o provedor é o de log, que registra só o assunto e o link. SMTP real não foi ligado porque não há biblioteca de e-mail instalada: para produção, implemente `EmailSender` e troque o `useExisting` do `EmailModule`.
