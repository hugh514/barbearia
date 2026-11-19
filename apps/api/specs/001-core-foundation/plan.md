# Plano Técnico 001: Core Foundation

**Input:** `specs/001-core-foundation/spec.md`
**Constituição:** `docs/constituicao/api.md`

---

## Verificação Constitucional

| Artigo | Status | Nota |
|--------|--------|------|
| I, API como Hub | sim | Feature de infraestrutura |
| II, Multi-tenancy | sim | Schema inicial já inclui tenant_id |
| III, Stack canônica | sim | NestJS, Prisma, PostgreSQL, Redis, Pino, Sentry |
| IV, Orientação a Eventos | N/A | Não há eventos nesta feature |
| V, Separação de módulos | sim | Estrutura de pastas definida |
| VI, Segurança | sim | Base para RBAC, sem rotas desprotegidas |
| VII, Observabilidade | sim | Pino, Sentry, Correlation ID, Health Check |
| VIII, DB é da API | sim | Migrations via Prisma |
| IX, Dev iterativo | sim | Feature 001 é pré-requisito bloqueante |

---

## Arquitetura Técnica

### Estrutura de Diretórios

```
barber-api/
├── src/
│   ├── main.ts
│   ├── app.module.ts
│   ├── modules/
│   │   ├── health/
│   │   │   ├── health.module.ts
│   │   │   └── health.controller.ts
│   │   └── tenants/               # Stub
│   ├── common/
│   │   ├── filters/
│   │   │   └── global-exception.filter.ts
│   │   ├── interceptors/
│   │   │   └── correlation-id.interceptor.ts
│   │   ├── decorators/
│   │   └── pipes/
│   │       └── zod-validation.pipe.ts
│   └── prisma/
│       ├── prisma.module.ts
│       └── prisma.service.ts
├── prisma/
│   ├── schema.prisma
│   ├── migrations/
│   └── seed.ts
├── docker-compose.yml
├── Dockerfile
├── .env.example
└── tsconfig.json
```

### Schema Prisma Inicial

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model Tenant {
  id        String   @id @default(uuid())
  name      String
  slug      String   @unique
  active    Boolean  @default(true)
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")

  users User[]
  @@map("tenants")
}

model User {
  id           String   @id @default(uuid())
  tenantId     String   @map("tenant_id")
  tenant       Tenant   @relation(fields: [tenantId], references: [id])
  name         String
  email        String
  passwordHash String   @map("password_hash")
  role         UserRole @default(BARBEIRO)
  active       Boolean  @default(true)
  createdAt    DateTime @default(now()) @map("created_at")
  updatedAt    DateTime @updatedAt @map("updated_at")

  @@unique([tenantId, email])
  @@index([tenantId])
  @@map("users")
}

enum UserRole {
  ADMIN
  GERENTE
  BARBEIRO
  CLIENTE
}
```

### Variáveis de Ambiente

```env
NODE_ENV=development
PORT=3000
APP_NAME="Barber API"
DATABASE_URL="postgresql://barber:barber@localhost:5432/barber_db?schema=public"
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
SENTRY_DSN=
SWAGGER_ENABLED=true
SWAGGER_USER=admin
SWAGGER_PASS=secret
JWT_SECRET=
JWT_EXPIRES_IN=15m
JWT_REFRESH_SECRET=
JWT_REFRESH_EXPIRES_IN=7d
```

### Docker Compose

```yaml
version: '3.9'
services:
  api:
    build:
      context: .
      target: development
    volumes:
      - .:/app
      - /app/node_modules
    ports:
      - "3000:3000"
    env_file: .env
    depends_on:
      - postgres
      - redis
    command: npm run start:dev

  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: barber
      POSTGRES_PASSWORD: barber
      POSTGRES_DB: barber_db
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data

volumes:
  postgres_data:
  redis_data:
```

---

## Pacotes NPM

```bash
# Produção
npm install @nestjs/config @nestjs/swagger @nestjs/terminus
npm install @prisma/client prisma
npm install pino pino-http nestjs-pino pino-pretty
npm install @sentry/nestjs @sentry/node
npm install ioredis
npm install zod @anatine/zod-nestjs
npm install uuid

# Dev
npm install -D @types/uuid
```

---

## Endpoints

| Método | Rota | Auth | Descrição |
|--------|------|------|-----------|
| GET | `/health` | Pública | Status da API, DB e Redis |
| GET | `/docs` | Basic Auth (prod) | Swagger UI |
