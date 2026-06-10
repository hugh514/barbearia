# 📦 Barber API — Pacote de Bootstrap

## O que tem aqui

| Arquivo | Para quê |
|---------|----------|
| `PROMPT.md` | Prompt master completo — leia primeiro |
| `CURSOR-COMPOSER-PROMPT.md` | Prompt pronto para colar no Cursor Composer 2.5 (Mode: Agent) |
| `CLAUDE-CODE-PROMPT.md` | Prompt pronto para colar no Claude Code (terminal) |
| `CLAUDE.md` | Arquivo de contexto que vai na raiz do repositório |
| `bootstrap.sh` | Script automático que faz tudo (Linux/Mac) |
| `barber-specs/` | Todas as 10 specs + constituição + README |

## Como usar

### Opção A — Script automático (recomendado)

```bash
# Extraia o zip e rode:
chmod +x bootstrap.sh
./bootstrap.sh barber-api claude
```

### Opção B — Com Cursor Composer

1. Abra o repositório no Cursor
2. Abra o Composer (Cmd+I)
3. Mode: **Agent** (NÃO Fast)
4. Cole o conteúdo de `CURSOR-COMPOSER-PROMPT.md`
5. Siga as instruções

### Opção C — Com Claude Code

1. Navegue até o diretório do projeto no terminal
2. Execute `claude`
3. Cole o conteúdo de `CLAUDE-CODE-PROMPT.md`
4. Siga as instruções

## Fluxo de desenvolvimento

```
Setup (esta sessão)
  ↓
Feature 001 — Core Foundation (NestJS + Prisma + Docker)
  ↓
Feature 002 — Auth & RBAC (JWT + guards)
  ↓
Feature 003 — Customer CRM
  ↓
Feature 004 — Conversations & Messages
  ↓
Feature 005 — Appointments (walk-in)
  ↓
Feature 006 — Plans & Subscriptions
  ↓
Feature 007 — Payments (Mercado Pago)
  ↓
Feature 008 — Events & Queues (BullMQ)
  ↓
Feature 009 — Dashboard
  ↓
Feature 010 — WhatsApp + Instagram + IA (OpenAI)
```

## Total de tasks: ~268 distribuídas em 10 features
