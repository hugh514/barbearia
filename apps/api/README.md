# api-barbearia

API central (hub) da plataforma de barbearia. O backoffice (`barbearia-backoffice`) e o app do cliente (`barbearia-cliente`) falam **somente** com esta API.

| Item | Valor |
|------|--------|
| Repositório | https://github.com/hugh514/api-barbearia |
| Porta local | `http://localhost:3000` |
| Swagger (dev) | `http://localhost:3000/docs` |
| Health | `GET /health` |

Multi-tenant desde o dia 1: todo endpoint é isolado por `tenantId`.

## O que a API faz

| Área | Descrição |
|------|-----------|
| **Auth & RBAC** | JWT + refresh, papéis `ADMIN`, `GERENTE`, `BARBEIRO`, `CLIENTE` |
| **CRM** | Cadastro e histórico de clientes |
| **Mensagens** | Conversas omnichannel (WhatsApp / Instagram) com Socket.IO |
| **Fila walk-in** | Atendimentos por ordem de chegada — sem agendamento |
| **Check-in QR** | Cliente gera token; equipe consome e entra na fila |
| **Planos & assinaturas** | Planos recorrentes e ciclo de vida da assinatura |
| **Pagamentos** | Mercado Pago (PIX, webhook) |
| **Eventos & filas** | Efeitos colaterais via BullMQ |
| **Dashboard** | Métricas para o backoffice |
| **Canais** | WhatsApp (Evolution API), Instagram (Graph API) + IA (OpenAI) |

## Stack

NestJS 10 · Prisma 5 · PostgreSQL 16 · Redis 7 · BullMQ · Socket.IO · Zod · Pino · Sentry · Docker

## Configuração rápida

```bash
npm install
cp .env.example .env
docker compose up -d postgres redis
npm run prisma:migrate
npm run prisma:seed
npm run start:dev
```

### Docker (API + banco + Redis)

```bash
docker compose up
```

PostgreSQL no host: porta **5433**.

## Scripts úteis

```bash
npm run start:dev
npm run build
npm run lint
npm test
npm run test:e2e
npm run prisma:studio
```

## Estrutura

```text
src/
  modules/     # auth, customers, appointments, payments, plans, …
  queue/       # processors BullMQ
  events/      # contratos de eventos
  common/      # guards, filters, pagination
prisma/        # schema, migrations, seed
specs/         # SDD (spec.md, plan.md, tasks.md)
test/          # e2e por feature
```

## Ecossistema

| Repositório | Papel | Porta |
|-------------|--------|-------|
| [api-barbearia](https://github.com/hugh514/api-barbearia) | API | 3000 |
| [barbearia-backoffice](https://github.com/hugh514/barbearia-backoffice) | Painel da equipe | 3001 |
| [barbearia-cliente](https://github.com/hugh514/barbearia-cliente) | App do cliente | 3002 |

## Licença

UNLICENSED — uso privado.
