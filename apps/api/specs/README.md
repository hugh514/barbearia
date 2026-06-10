# Barber API — Spec-Driven Development Package

> Pacote completo de especificações para desenvolvimento da API central da plataforma de barbearia.
> Siga a ordem numérica. Cada feature depende da anterior.

## Como usar com IA

1. Leia `specs/000-development-workflow/workflow.md` — ciclo Composer, branches e sessões de fix
2. Comece lendo `.specify/memory/constitution.md` — são os princípios inegociáveis
3. Para cada feature (001→010), leia na ordem: `spec.md` → `plan.md` → `tasks.md`
4. Implemente as tasks na ordem listada
5. Peça ao agente **criar** `validation.md`, `scripts/smoke-NNN.sh` e `test/feature-NNN.e2e-spec.ts`, depois **rodar** `npm run smoke:NNN` e `npm run test:e2e`
6. Só passe para a próxima feature quando smoke + e2e passarem e os itens manuais estiverem OK

## Mapa de Features

| # | Feature | Branch | Depende de | Status |
|---|---------|--------|------------|--------|
| 001 | Core Foundation | `feat/001-core-foundation` | — | Ready |
| 002 | Auth & RBAC | `feat/002-auth-rbac` | 001 | Ready |
| 003 | Customer CRM | `feat/003-customer-crm` | 002 | Ready |
| 004 | Conversations | `feat/004-conversations-messaging` | 003 | Ready |
| 005 | Appointments | `feat/005-appointments-attendance` | 003 | Ready |
| 006 | Plans & Subscriptions | `feat/006-plans-subscriptions` | 003 | Ready |
| 007 | Payments | `feat/007-payments-integration` | 006 | Ready |
| 008 | Events & Queues | `feat/008-event-system-queues` | 005, 007 | Ready |
| 009 | Dashboard | `feat/009-dashboard-backoffice` | 008 | Ready |
| 010 | WhatsApp & Instagram | `feat/010-whatsapp-instagram-channels` | 004, 008 | Ready |

## Stack

NestJS · Prisma · PostgreSQL · Redis · BullMQ · JWT · Swagger · Socket.IO · Pino · Sentry · Docker

## Repositório

`github.com/hugh514/api-barbearia`
