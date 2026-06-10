# Tasks 001 — Core Foundation

**Input:** `specs/001-core-foundation/plan.md`

---

## Fase 1 — Scaffold do Projeto

- [ ] T001-01 Inicializar projeto NestJS com `nest new barber-api --strict`
- [ ] T001-02 Configurar `tsconfig.json` com path aliases (`@modules`, `@common`, `@prisma`)
- [ ] T001-03 Configurar ESLint + Prettier
- [ ] T001-04 Criar estrutura de diretórios conforme plan.md
- [ ] T001-05 Instalar e configurar `@nestjs/config` com validação de env por Zod

## Fase 2 — Prisma e Banco de Dados

- [ ] T001-06 Instalar Prisma CLI e client
- [ ] T001-07 Criar `prisma/schema.prisma` com modelos Tenant e User
- [ ] T001-08 Criar `PrismaService` com shutdown hooks (`onModuleDestroy`)
- [ ] T001-09 Criar `PrismaModule` como global
- [ ] T001-10 Rodar `prisma migrate dev --name init`
- [ ] T001-11 Criar `prisma/seed.ts` com tenant "Barbearia Modelo" e usuário ADMIN

## Fase 3 — Docker

- [ ] T001-12 Criar `Dockerfile` multi-stage (target: development, production)
- [ ] T001-13 Criar `docker-compose.yml` com serviços: api, postgres, redis
- [ ] T001-14 Criar `.env.example` com todas as variáveis
- [ ] T001-15 Testar `docker-compose up` e verificar hot reload

## Fase 4 — Observabilidade e Health Check

- [ ] T001-16 Instalar e configurar `nestjs-pino` como logger global
- [ ] T001-17 Criar `CorrelationIdInterceptor`
- [ ] T001-18 Criar `GlobalExceptionFilter` com resposta padronizada
- [ ] T001-19 Instalar `@nestjs/terminus` e criar `HealthModule`
- [ ] T001-20 Configurar Sentry via `@sentry/nestjs`

## Fase 5 — Swagger

- [ ] T001-21 Instalar `@nestjs/swagger` e configurar no main.ts
- [ ] T001-22 Adicionar metadados: título, versão, descrição, bearer auth placeholder
- [ ] T001-23 Proteger `/docs` com Basic Auth quando `NODE_ENV=production`

## Fase 6 — Validação Final

- [ ] T001-24 `GET /health` retorna 200 com status de DB e Redis
- [ ] T001-25 Request com body inválido retorna erro padronizado com correlationId
- [ ] T001-26 `docker-compose up` sobe tudo sem erros
- [ ] T001-27 Migration roda limpa: `prisma migrate deploy`
- [ ] T001-28 Seed popula banco com tenant e user de exemplo
- [ ] T001-29 Swagger acessível em `/docs` em modo dev
