# Specs da API

Uma pasta por feature, na ordem em que foram construídas. Cada uma tem `spec.md` (o que), `plan.md` (como) e `tasks.md` (ordem). Os princípios que valem para todas estão em `docs/constituicao/api.md`, na raiz do repositório.

| # | Feature | Depende de |
|---|---------|------------|
| 001 | Base (config, logs, health, Prisma) | - |
| 002 | Login e papéis (RBAC) | 001 |
| 003 | Clientes (CRM) | 002 |
| 004 | Conversas e mensagens | 003 |
| 005 | Atendimentos por ordem de chegada | 003 |
| 006 | Planos e assinaturas | 003 |
| 007 | Pagamentos (Mercado Pago) | 006 |
| 008 | Eventos e filas (BullMQ) | 005, 007 |
| 009 | Dashboard | 008 |
| 010 | WhatsApp e Instagram | 004, 008 |
| 011 | Check-in por QR Code | 005, 010 |
| 012 | Recuperação de senha | 002 |
| 013 | Autoatendimento do cliente | 002, 005, 006 |

Cada feature fechou com um teste e2e em `test/feature-NNN.e2e-spec.ts`.
