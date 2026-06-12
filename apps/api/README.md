# Barber API

API central (hub) da plataforma de barbearia. WhatsApp, Instagram, app mobile e backoffice se comunicam **somente** por esta API — nenhum sistema fala direto com outro.

Multi-tenant desde o dia 1: todo endpoint é isolado por `tenant_id`.

## O que a API faz

| Área | Descrição |
|------|-----------|
| **Auth & RBAC** | JWT + refresh token, papéis `ADMIN`, `GERENTE`, `BARBEIRO`, `CLIENTE` |
| **CRM** | Cadastro e histórico de clientes |
| **Mensagens** | Conversas omnichannel (WhatsApp / Instagram) com Socket.IO |
| **Fila walk-in** | Atendimentos por ordem de chegada — **sem agendamento** |
| **Check-in QR** | Cliente gera token; equipe consome e entra na fila |
| **Planos & assinaturas** | Planos recorrentes e ciclo de vida da assinatura |
| **Pagamentos** | Integração Mercado Pago (PIX, webhook) |
| **Eventos & filas** | Efeitos colaterais via BullMQ (não no handler HTTP) |
| **Dashboard** | Métricas para backoffice (receita, fila, planos, etc.) |
| **Canais** | WhatsApp (Evolution API), Instagram (Graph API) + IA (OpenAI) |

## Stack

NestJS 10 · Prisma 5 · PostgreSQL 16 · Redis 7 · BullMQ · Socket.IO · Zod · Pino · Sentry · Docker

## Pré-requisitos

- Node.js 20+
- Docker e Docker Compose (para PostgreSQL e Redis)

## Configuração rápida

```bash
# 1. Dependências
npm install

# 2. Variáveis de ambiente
cp .env.example .env
# Ajuste DATABASE_URL, JWT_* e integrações conforme necessário

# 3. Infra local
docker compose up -d postgres redis

# 4. Banco de dados
npm run prisma:migrate
npm run prisma:seed

# 5. API em modo dev
npm run start:dev
```

A API sobe em `http://localhost:3000`.

- **Swagger** (dev): `http://localhost:3000/docs` — usuário/senha em `SWAGGER_USER` / `SWAGGER_PASS`
- **Health**: `GET /health`

### Docker (API + banco + Redis)

```bash
docker compose up
```

O serviço `api` usa hot reload; PostgreSQL fica exposto na porta **5433** no host.

## Scripts úteis

```bash
npm run start:dev        # desenvolvimento com watch
npm run build            # build de produção
npm run lint             # ESLint
npm test                 # testes unitários
npm run test:e2e         # testes e2e (Jest)
npm run prisma:studio    # UI do banco
npm run smoke:001        # smoke test da feature 001
```

Testes e2e por feature:

```bash
npm run test:e2e -- feature-005
npm run test:e2e -- feature-011
```

## Estrutura do projeto

```
src/
  modules/          # domínios (auth, customers, appointments, payments, …)
  queue/            # listeners e processors BullMQ
  events/           # contratos de eventos de domínio
  common/           # guards, interceptors, config, pagination
prisma/             # schema, migrations, seed
specs/              # specs SDD (spec.md, plan.md, tasks.md)
test/               # e2e por feature (feature-NNN.e2e-spec.ts)
```

Desenvolvimento orientado a specs (SDD). Features numeradas de `001` a `011` em `specs/`. Detalhes de arquitetura e regras de negócio estão em `.specify/memory/constitution.md`.

## Integrações (opcionais em dev)

| Variável | Serviço |
|----------|---------|
| `MERCADO_PAGO_*` | Pagamentos |
| `EVOLUTION_API_*` | WhatsApp |
| `INSTAGRAM_*` | Instagram |
| `OPENAI_*` | Respostas assistidas por IA nos canais |
| `SENTRY_DSN` | Observabilidade |

Valores padrão de desenvolvimento estão em `.env.example`.

## Contribuindo

- Commits em **inglês**, [Conventional Commits](https://www.conventionalcommits.org/)
- Um commit lógico por mudança; PRs pequenos por feature
- Sem trailers de atribuição a IA em commits ou PRs

```bash
git config core.hooksPath .githooks
```

Veja [CONTRIBUTING.md](./CONTRIBUTING.md).

## Licença

UNLICENSED — uso privado.
