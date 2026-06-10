# 🔧 Prompt Master — Barber API Setup

> **INSTRUÇÃO PARA IA DE DESENVOLVIMENTO**
> Este documento é o prompt completo que você deve seguir para configurar o projeto Barber API do zero.
> Leia TUDO antes de executar qualquer comando. Não pule etapas. Não seja fast.

---

## Quem Você É

Você é um engenheiro de software sênior configurando a infraestrutura de um projeto NestJS seguindo a metodologia **Spec-Driven Development (SDD)** via GitHub Spec Kit. Você **não vai codar features ainda** — apenas preparar o ambiente, integrar o spec-kit, e validar que tudo está pronto para desenvolvimento.

---

## Contexto do Projeto

- **Projeto:** API central para plataforma de barbearia (Barbearia Modelo, Ji-Paraná/RO)
- **Repositório:** `github.com/hugh514/api-barbearia`
- **Stack:** NestJS + Prisma + PostgreSQL + Redis + BullMQ + JWT + Socket.IO + Docker
- **Metodologia:** Spec-Driven Development com GitHub Spec Kit
- **Modelo de negócio:** Atendimento por ordem de chegada (walk-in), NÃO agendamento

---

## O Que Você Vai Fazer (Nesta Ordem Exata)

### Fase 0 — Clonar e Preparar o Repositório

```bash
# 1. Clonar o repositório (se não estiver clonado)
git clone https://github.com/hugh514/api-barbearia.git barber-api
cd barber-api

# 2. Criar branch de setup
git checkout -b setup/spec-kit-integration
```

### Fase 1 — Instalar Spec Kit com Integração Claude

```bash
# 1. Instalar o CLI do Spec Kit
pipx install git+https://github.com/github/spec-kit.git
# OU se não tiver pipx:
# uvx --from git+https://github.com/github/spec-kit.git specify init . --integration claude

# 2. Inicializar Spec Kit no projeto com integração Claude Code
specify init . --integration claude

# Isso vai criar:
# .specify/           → diretório de memória e templates do spec-kit
# .claude/            → comandos e skills para Claude Code
# specs/              → onde ficarão as specs (vamos popular)
```

> **IMPORTANTE:** Se o repositório já tiver conteúdo, use `specify init . --integration claude --force`

### Fase 2 — Integrar as Specs do Projeto

Copie TODOS os arquivos do zip `barber-api-specs.zip` para dentro do repositório, respeitando a estrutura:

```bash
# Extrair o zip para dentro do repositório
unzip barber-api-specs.zip -d /tmp/barber-specs-temp
cp -r /tmp/barber-specs-temp/barber-specs/.specify/memory/constitution.md .specify/memory/constitution.md
cp -r /tmp/barber-specs-temp/barber-specs/specs/* specs/
cp /tmp/barber-specs-temp/barber-specs/README.md specs/README.md
rm -rf /tmp/barber-specs-temp
```

A estrutura final deve ser:

```
barber-api/
├── .specify/
│   └── memory/
│       └── constitution.md          ← Constituição do projeto (10 artigos)
├── .claude/
│   └── commands/                    ← Comandos spec-kit para Claude Code
├── specs/
│   ├── README.md                    ← Índice master
│   ├── 001-core-foundation/
│   │   ├── spec.md
│   │   ├── plan.md
│   │   └── tasks.md
│   ├── 002-auth-rbac/
│   │   ├── spec.md
│   │   ├── plan.md
│   │   └── tasks.md
│   ├── 003-customer-crm/
│   │   ├── spec.md
│   │   ├── plan.md
│   │   └── tasks.md
│   ├── 004-conversations-messaging/
│   │   ├── spec.md
│   │   ├── plan.md
│   │   └── tasks.md
│   ├── 005-appointments-attendance/
│   │   ├── spec.md
│   │   ├── plan.md
│   │   └── tasks.md
│   ├── 006-plans-subscriptions/
│   │   ├── spec.md
│   │   ├── plan.md
│   │   └── tasks.md
│   ├── 007-payments-integration/
│   │   ├── spec.md
│   │   ├── plan.md
│   │   └── tasks.md
│   ├── 008-event-system-queues/
│   │   ├── spec.md
│   │   ├── plan.md
│   │   └── tasks.md
│   ├── 009-dashboard-backoffice/
│   │   ├── spec.md
│   │   ├── plan.md
│   │   └── tasks.md
│   └── 010-whatsapp-instagram-channels/
│       ├── spec.md
│       ├── plan.md
│       └── tasks.md
└── ... (código fonte virá depois)
```

### Fase 3 — Criar Arquivos de Configuração Base do Projeto

Crie os seguintes arquivos na raiz:

#### `.gitignore`

```gitignore
node_modules/
dist/
.env
*.env.local
.DS_Store
coverage/
prisma/migrations/*.sql.pending
```

#### `.nvmrc`

```
20
```

#### `.editorconfig`

```ini
root = true

[*]
indent_style = space
indent_size = 2
end_of_line = lf
charset = utf-8
trim_trailing_whitespace = true
insert_final_newline = true
```

#### `package.json` (scaffold inicial — sem dependências ainda)

```json
{
  "name": "barber-api",
  "version": "0.0.1",
  "description": "API central da plataforma de barbearia — Barbearia Modelo",
  "private": true,
  "license": "UNLICENSED",
  "scripts": {
    "prebuild": "rimraf dist",
    "build": "nest build",
    "format": "prettier --write \"src/**/*.ts\" \"test/**/*.ts\"",
    "start": "nest start",
    "start:dev": "nest start --watch",
    "start:debug": "nest start --debug --watch",
    "start:prod": "node dist/main",
    "lint": "eslint \"{src,apps,libs,test}/**/*.ts\" --fix",
    "test": "jest",
    "test:watch": "jest --watch",
    "test:cov": "jest --coverage",
    "test:e2e": "jest --config ./test/jest-e2e.json",
    "prisma:generate": "prisma generate",
    "prisma:migrate": "prisma migrate dev",
    "prisma:seed": "ts-node prisma/seed.ts",
    "docker:up": "docker-compose up -d",
    "docker:down": "docker-compose down"
  },
  "engines": {
    "node": ">=20.0.0"
  }
}
```

### Fase 4 — Criar CLAUDE.md (Contexto para Claude Code)

Crie um arquivo `CLAUDE.md` na raiz do repositório:

````markdown
# CLAUDE.md — Contexto do Projeto para Claude Code

## O que é este projeto

API central (hub) para plataforma de barbearia. Todos os sistemas (WhatsApp, Instagram, App Mobile, Backoffice) se comunicam exclusivamente pela API. Nenhum sistema fala direto com outro.

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

001 → 002 → 003 → 004 → 005 → 006 → 007 → 008 → 009 → 010

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
````

````

### Fase 5 — Validar a Integração

Execute estes checks antes de commitar:

```bash
# 1. Spec Kit está instalado?
specify --version

# 2. Constitution existe?
cat .specify/memory/constitution.md | head -5

# 3. Todas as 10 specs estão presentes?
ls specs/ | wc -l  # Deve retornar 10 diretórios + README

# 4. Cada spec tem os 3 arquivos?
for dir in specs/0*/; do
  echo "$dir: $(ls $dir | tr '\n' ' ')"
done
# Cada um deve ter: plan.md spec.md tasks.md

# 5. Claude commands existem? (se usando Claude Code)
ls .claude/commands/ 2>/dev/null || echo "Usando outro agente"

# 6. CLAUDE.md existe?
test -f CLAUDE.md && echo "OK" || echo "FALTA CLAUDE.md"
````

### Fase 6 — Commit Inicial

```bash
git add .
git commit -m "chore: integrate spec-kit with barber-api specs (001-010)

- Spec Kit initialized with Claude Code integration
- Constitution v2.0 with 10 articles (including walk-in model)
- 10 feature specs with spec.md + plan.md + tasks.md each
- CLAUDE.md context file for AI-assisted development
- Project scaffold (package.json, .gitignore, .editorconfig)"

git push origin setup/spec-kit-integration
```

---

## O Que NÃO Fazer Nesta Etapa

- ❌ NÃO inicialize o projeto NestJS ainda (`nest new` é Task T001-01)
- ❌ NÃO instale dependências npm ainda
- ❌ NÃO crie o Docker Compose ainda (é Task T001-12)
- ❌ NÃO crie o schema Prisma ainda (é Task T001-07)
- ❌ NÃO comece a codar nenhuma feature

Esta etapa é **exclusivamente** setup do repositório + integração do Spec Kit + validação da estrutura.

---

## Próximo Passo

Quando esta etapa estiver concluída e validada, execute:

```
/speckit.implement Feature 001 — Core Foundation
```

Leia `specs/001-core-foundation/tasks.md` e execute cada task na ordem.

---

_Este prompt foi gerado para o projeto Barbearia Modelo — Barber API_
_Spec Kit integration: Claude Code_
_Total de features: 10 | Total de tasks: ~268_
