# Plano Técnico 003: Gestão de Clientes e CRM Automático

**Input:** `specs/003-customer-crm/spec.md`

---

## Verificação Constitucional

| Artigo | Status | Nota |
|--------|--------|------|
| I, API como Hub | sim | CRM automático via endpoint, não acesso direto |
| II, Multi-tenancy | sim | Customer scoped por tenant_id |
| III, Stack canônica | sim | Prisma, PostgreSQL |
| IV, Orientação a Eventos | sim | `CLIENTE_CADASTRADO` emitido na criação |
| V, Separação de módulos | sim | `customers/` isolado |
| VI, Segurança | sim | JWT + RBAC em todas as rotas, upsert via API key |
| X, Ordem de chegada | sim | Sem lógica de agendamento |

---

## Arquitetura Técnica

### Estrutura de Diretórios

```
src/modules/customers/
  customers.module.ts
  customers.controller.ts
  customers.service.ts
  dto/
    create-customer.dto.ts
    update-customer.dto.ts
    upsert-customer.dto.ts
    customer-response.dto.ts
    customer-query.dto.ts
```

### Schema Prisma (adicional ao existente)

```prisma
model Customer {
  id            String         @id @default(uuid())
  tenantId      String         @map("tenant_id")
  tenant        Tenant         @relation(fields: [tenantId], references: [id])
  name          String
  phone         String
  instagramId   String?        @map("instagram_id")
  instagramUser String?        @map("instagram_user")
  origin        CustomerOrigin @default(MANUAL)
  planStatus    PlanStatus     @default(NONE)
  lastVisit     DateTime?      @map("last_visit")
  active        Boolean        @default(true)
  createdAt     DateTime       @default(now()) @map("created_at")
  updatedAt     DateTime       @updatedAt @map("updated_at")

  appointments  Appointment[]
  conversations Conversation[]
  subscriptions Subscription[]

  @@unique([tenantId, phone])
  @@index([tenantId])
  @@index([tenantId, phone])
  @@index([tenantId, name])
  @@map("customers")
}

enum CustomerOrigin {
  MANUAL
  WHATSAPP
  INSTAGRAM
}

enum PlanStatus {
  NONE
  ACTIVE
  PENDING
  OVERDUE
  CANCELLED
}
```

### Busca Textual

A busca em `GET /customers?search=` usa `ILIKE` no PostgreSQL para nome, telefone e instagram_user. Sem full-text search nesta fase, se a base crescer, migrar para `tsvector` no futuro.

```sql
WHERE tenant_id = $1
  AND (name ILIKE $2 OR phone ILIKE $2 OR instagram_user ILIKE $2)
```

### CRM Automático (Upsert)

O endpoint `POST /customers/upsert` é usado internamente pelo módulo WhatsApp/Instagram:
- Recebe `{ phone, name?, origin }` + `tenant_id` via header/API key
- Faz `findFirst` por `(tenant_id, phone)`
- Se existe: retorna sem modificar
- Se não existe: cria e emite `CLIENTE_CADASTRADO`
- Protegido por API key interna (header `X-Internal-Key`)

---

## Endpoints

| Método | Rota | Roles | Descrição |
|--------|------|-------|-----------|
| POST | `/customers` | ADMIN, GERENTE, BARBEIRO | Cadastro manual |
| POST | `/customers/upsert` | API Key interna | CRM automático |
| GET | `/customers` | ADMIN, GERENTE, BARBEIRO | Busca paginada |
| GET | `/customers/:id` | ADMIN, GERENTE, BARBEIRO | Perfil completo |
| PATCH | `/customers/:id` | ADMIN, GERENTE, BARBEIRO | Atualização parcial |
| GET | `/customers/:id/history` | ADMIN, GERENTE | Histórico de atendimentos |
| GET | `/customers/:id/conversations` | ADMIN, GERENTE | Conversas do cliente |

### Paginação Padrão

```json
{
  "data": [...],
  "meta": {
    "total": 150,
    "page": 1,
    "perPage": 20,
    "lastPage": 8
  }
}
```
