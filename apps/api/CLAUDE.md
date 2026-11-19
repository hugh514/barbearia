# CLAUDE.md — api-barbearia

## O que é este projeto

API central (hub) da plataforma de barbearia (`github.com/hugh514/api-barbearia`).
Backoffice e app do cliente (`barbearia-backoffice`, `barbearia-cliente`) falam só com esta API.
WhatsApp, Instagram e demais canais também passam por aqui.

## Constituição

Leia OBRIGATORIAMENTE `.specify/memory/constitution.md` antes de qualquer implementação. São 10 artigos inegociáveis.

## Stack

NestJS 10+ · Prisma 5+ · PostgreSQL 16 · Redis 7 · BullMQ · JWT + Refresh Token · Socket.IO · Pino · Sentry · Docker

## Metodologia

Spec-Driven Development (SDD). Cada feature tem:
- `spec.md` → O QUE construir (requisitos, user stories, acceptance criteria)
- `plan.md` → COMO construir (arquitetura técnica, schema, endpoints)
- `tasks.md` → ORDEM de construção (tasks numeradas com checkboxes)

## Ordem de desenvolvimento (NUNCA pule)

001 → 002 → 003 → 004 → 005 → 006 → 007 → 008 → 009 → 010 → 011

## Regras invioláveis

1. TODO endpoint tem `tenant_id` — multi-tenancy desde o dia 1
2. Sem agendamento — a barbearia funciona por ORDEM DE CHEGADA (walk-in)
3. Efeitos colaterais (enviar WhatsApp, pedir avaliação) NUNCA no handler HTTP — vão para BullMQ
4. A IA (OpenAI) NUNCA acessa o banco direto — tudo via API
5. UUID v4 como PK, nunca auto-increment
6. Soft delete em entidades de negócio
7. TypeScript strict, sem `any` implícito

## Como trabalhar neste projeto

1. Leia a spec da feature (`specs/NNN-feature/spec.md`)
2. Leia o plano técnico (`plan.md`)
3. Siga as tasks na ordem (`tasks.md`)
4. Marque cada task com [x] ao completar
5. Só passe para a próxima feature quando TODAS as tasks estiverem [x]

## Comandos úteis

```bash
docker-compose up -d          # Subir PostgreSQL + Redis
npm run start:dev             # API em modo dev com hot reload
npx prisma migrate dev        # Rodar migrations
npx prisma studio             # UI visual do banco
npm run lint                  # Lint
npm test                      # Testes
```

<!-- SPECKIT START -->
For additional context about technologies to be used, project structure,
shell commands, and other important information, read the current plan
<!-- SPECKIT END -->
