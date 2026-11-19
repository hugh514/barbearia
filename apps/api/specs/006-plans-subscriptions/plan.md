# Plano Técnico 006: Planos e Assinaturas

**Input:** `specs/006-plans-subscriptions/spec.md`

---

## Schema Prisma

```prisma
model Plan {
  id           String   @id @default(uuid())
  tenantId     String   @map("tenant_id")
  tenant       Tenant   @relation(fields: [tenantId], references: [id])
  name         String
  description  String?
  priceCents   Int      @map("price_cents")
  intervalDays Int      @default(30) @map("interval_days")
  benefits     String[]
  active       Boolean  @default(true)
  createdAt    DateTime @default(now()) @map("created_at")
  updatedAt    DateTime @updatedAt @map("updated_at")

  subscriptions Subscription[]

  @@index([tenantId])
  @@map("plans")
}

model Subscription {
  id            String             @id @default(uuid())
  tenantId      String             @map("tenant_id")
  tenant        Tenant             @relation(fields: [tenantId], references: [id])
  customerId    String             @map("customer_id")
  customer      Customer           @relation(fields: [customerId], references: [id])
  planId        String             @map("plan_id")
  plan          Plan               @relation(fields: [planId], references: [id])
  status        SubscriptionStatus @default(PENDENTE)
  startedAt     DateTime?          @map("started_at")
  nextBillingAt DateTime?          @map("next_billing_at")
  cancelledAt   DateTime?          @map("cancelled_at")
  createdAt     DateTime           @default(now()) @map("created_at")
  updatedAt     DateTime           @updatedAt @map("updated_at")

  payments Payment[]

  @@index([tenantId, status])
  @@index([tenantId, customerId])
  @@map("subscriptions")
}

enum SubscriptionStatus {
  PENDENTE
  ATIVO
  SUSPENSO
  CANCELADO
}
```

## Unicidade de Assinatura Ativa

A regra "1 assinatura ativa por cliente por tenant" é validada no service, não via constraint SQL:
```typescript
const existing = await this.prisma.subscription.findFirst({
  where: { tenantId, customerId, status: { in: ['ATIVO', 'PENDENTE'] } }
});
if (existing) throw new ConflictException('Cliente já possui assinatura ativa');
```

## Atualização de planStatus no Customer

Quando assinatura muda de status, o `planStatus` do customer deve ser atualizado:
- ATIVO → customer.planStatus = ACTIVE
- CANCELADO → customer.planStatus = CANCELLED
- PENDENTE → customer.planStatus = PENDING
- SUSPENSO → customer.planStatus = OVERDUE

---

## Endpoints

| Método | Rota | Roles |
|--------|------|-------|
| POST | `/plans` | ADMIN |
| GET | `/plans` | Qualquer autenticado |
| GET | `/plans/:id` | Qualquer autenticado |
| PATCH | `/plans/:id` | ADMIN |
| DELETE | `/plans/:id` | ADMIN |
| POST | `/subscriptions` | ADMIN, GERENTE, CLIENTE |
| GET | `/subscriptions` | ADMIN, GERENTE |
| GET | `/subscriptions/:id` | ADMIN, GERENTE, CLIENTE (own) |
| PATCH | `/subscriptions/:id/activate` | API Key (payments) |
| PATCH | `/subscriptions/:id/suspend` | API Key (payments) |
| PATCH | `/subscriptions/:id/cancel` | ADMIN, GERENTE, CLIENTE (own) |
| PATCH | `/subscriptions/:id/renew` | API Key (payments) |
