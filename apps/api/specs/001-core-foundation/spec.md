# Spec 001 — Core Foundation

**Branch:** `feat/001-core-foundation`
**Status:** Ready for Implementation
**Prioridade:** P0 — Bloqueante para todas as outras features

---

## Contexto

Antes de qualquer módulo de negócio existir, a API precisa de uma base sólida: estrutura de projeto, banco de dados configurado, containerização, health check e documentação automática. Esta feature não entrega valor de negócio diretamente, mas nenhuma outra feature pode ser implementada sem ela.

---

## User Stories

### US-001.1 — Setup do Projeto (Priority: P0)

**Como** desenvolvedor,
**Quero** que o projeto NestJS esteja scaffolded com a estrutura de módulos canônica,
**Para que** eu possa começar a implementar features sem retrabalho de estrutura.

**Critérios de Aceite:**
- [ ] Projeto NestJS inicializado com TypeScript strict
- [ ] Estrutura de pastas conforme Artigo V da constituição
- [ ] ESLint + Prettier configurados
- [ ] Path aliases configurados (`@modules/*`, `@common/*`, `@prisma/*`)
- [ ] Variáveis de ambiente via `@nestjs/config` com validação por schema Zod

### US-001.2 — Banco de Dados e ORM (Priority: P0)

**Como** desenvolvedor,
**Quero** que o Prisma esteja configurado com o schema inicial,
**Para que** eu possa rodar migrations e ter o banco pronto para uso.

**Critérios de Aceite:**
- [ ] Prisma configurado com provider `postgresql`
- [ ] `PrismaService` como módulo global
- [ ] Schema inicial com tabelas: `tenants`, `users`
- [ ] Campo `tenant_id` presente em todas as tabelas de negócio
- [ ] UUIDs como PK (não auto-increment)
- [ ] Migration inicial gerada e aplicável via `prisma migrate dev`
- [ ] `prisma/seed.ts` com tenant e usuário ADMIN de exemplo

### US-001.3 — Containerização (Priority: P0)

**Como** desenvolvedor,
**Quero** subir o ambiente completo com um único comando,
**Para que** não haja dependência de instalações manuais.

**Critérios de Aceite:**
- [ ] `Dockerfile` multi-stage (dev e prod)
- [ ] `docker-compose.yml` com: API, PostgreSQL, Redis
- [ ] Volumes persistentes para PostgreSQL e Redis
- [ ] Hot reload funcionando no container de dev
- [ ] `.env.example` documentado com todas as variáveis

### US-001.4 — Health Check e Observabilidade (Priority: P0)

**Como** operador de infraestrutura,
**Quero** que a API exponha um endpoint de saúde,
**Para que** eu possa monitorar se o serviço está operacional.

**Critérios de Aceite:**
- [ ] `GET /health` retorna status da API, PostgreSQL e Redis
- [ ] Pino configurado como logger (JSON em produção, pretty em dev)
- [ ] Correlation ID injetado em cada request via interceptor
- [ ] Sentry configurado e capturando exceções não tratadas
- [ ] Global exception filter retornando respostas padronizadas

### US-001.5 — Documentação OpenAPI (Priority: P1)

**Como** desenvolvedor ou consumidor da API,
**Quero** documentação automática disponível,
**Para que** eu possa explorar e testar endpoints sem documento externo.

**Critérios de Aceite:**
- [ ] Swagger UI disponível em `/docs`
- [ ] Todos os DTOs documentados com `@ApiProperty`
- [ ] Respostas de erro documentadas
- [ ] Em produção, `/docs` protegido por Basic Auth ou desabilitado via env

---

## Requisitos Não-Funcionais

- TypeScript strict mode (sem `any` implícito)
- Node.js 20 LTS
- NestJS 10+
- Prisma 5+
- Tempo de startup < 5s

---

## Fora de Escopo

- Autenticação JWT (Feature 002)
- Qualquer módulo de negócio
- Migrations além de `tenants` e `users`
