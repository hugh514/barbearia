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
