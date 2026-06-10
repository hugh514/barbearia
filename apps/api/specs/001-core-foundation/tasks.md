# Tasks 001 — Core Foundation

**Input:** `specs/001-core-foundation/plan.md`

---

## Fase 1 — Scaffold do Projeto

- [x] T001-01 Inicializar projeto NestJS com `nest new barber-api --strict`
- [x] T001-02 Configurar `tsconfig.json` com path aliases (`@modules`, `@common`, `@prisma`)
- [x] T001-03 Configurar ESLint + Prettier
- [x] T001-04 Criar estrutura de diretórios conforme plan.md
- [x] T001-05 Instalar e configurar `@nestjs/config` com validação de env por Zod

## Fase 2 — Prisma e Banco de Dados

- [x] T001-06 Instalar Prisma CLI e client
- [x] T001-07 Criar `prisma/schema.prisma` com modelos Tenant e User
- [x] T001-08 Criar `PrismaService` com shutdown hooks (`onModuleDestroy`)
- [x] T001-09 Criar `PrismaModule` como global
- [x] T001-10 Rodar `prisma migrate dev --name init`
- [x] T001-11 Criar `prisma/seed.ts` com tenant "Barbearia Modelo" e usuário ADMIN

## Fase 3 — Docker

- [x] T001-12 Criar `Dockerfile` multi-stage (target: development, production)
- [x] T001-13 Criar `docker-compose.yml` com serviços: api, postgres, redis
- [x] T001-14 Criar `.env.example` com todas as variáveis
- [x] T001-15 Testar `docker-compose up` e verificar hot reload

## Fase 4 — Observabilidade e Health Check

- [x] T001-16 Instalar e configurar `nestjs-pino` como logger global
- [x] T001-17 Criar `CorrelationIdInterceptor`
- [x] T001-18 Criar `GlobalExceptionFilter` com resposta padronizada
- [x] T001-19 Instalar `@nestjs/terminus` e criar `HealthModule`
- [x] T001-20 Configurar Sentry via `@sentry/nestjs`

## Fase 5 — Swagger

- [x] T001-21 Instalar `@nestjs/swagger` e configurar no main.ts
- [x] T001-22 Adicionar metadados: título, versão, descrição, bearer auth placeholder
- [x] T001-23 Proteger `/docs` com Basic Auth quando `NODE_ENV=production`

## Fase 6 — Validação Final

- [x] T001-24 `GET /health` retorna 200 com status de DB e Redis
- [x] T001-25 Request com body inválido retorna erro padronizado com correlationId
- [x] T001-26 `docker-compose up` sobe tudo sem erros
- [x] T001-27 Migration roda limpa: `prisma migrate deploy`
- [x] T001-28 Seed popula banco com tenant e user de exemplo
- [x] T001-29 Swagger acessível em `/docs` em modo dev
