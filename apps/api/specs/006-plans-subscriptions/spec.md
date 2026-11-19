# Spec 006 — Planos e Assinaturas

**Branch:** `feat/006-plans-subscriptions`
**Status:** Ready for Implementation
**Depende de:** `003-customer-crm`

---

## Contexto

A barbearia oferece planos mensais de fidelização (ex: 4 cortes/mês). O admin define os planos disponíveis, e clientes assinam via app ou presencialmente. Este módulo gerencia a definição de planos e o ciclo de vida das assinaturas. O pagamento em si é responsabilidade da Feature 007.

---

## User Stories

### US-006.1 — Criar Plano (Priority: P0)

**Como** admin,
**Quero** criar planos de assinatura com nome, preço e benefícios,
**Para que** os clientes possam se inscrever.

**Critérios de Aceite:**
- [ ] `POST /plans` aceita: name, description, price, intervalDays (30, 15, etc), benefits[], active
- [ ] Plano pertence ao tenant
- [ ] Preço em centavos (integer) para evitar problemas de decimal
- [ ] Apenas ADMIN pode criar planos

### US-006.2 — Listar e Editar Planos (Priority: P1)

**Critérios de Aceite:**
- [ ] `GET /plans` retorna planos do tenant (filtro: active true/false)
- [ ] `GET /plans/:id` retorna detalhes
- [ ] `PATCH /plans/:id` atualiza campos (não afeta assinaturas existentes)
- [ ] `DELETE /plans/:id` faz soft-disable (active = false)

### US-006.3 — Assinar Plano (Priority: P0)

**Como** cliente (via app) ou gerente (via backoffice),
**Quero** assinar um plano para um cliente,
**Para que** ele tenha os benefícios mensais.

**Critérios de Aceite:**
- [ ] `POST /subscriptions` aceita: customerId, planId
- [ ] Status inicial: `PENDENTE` (muda para `ATIVO` após pagamento — Feature 007)
- [ ] Se assinatura via backoffice (role GERENTE/ADMIN): pode criar como `ATIVO` diretamente
- [ ] Cliente pode ter apenas 1 assinatura ativa por vez no tenant
- [ ] Emite evento `PLANO_ASSINADO`

### US-006.4 — Ciclo de Vida da Assinatura (Priority: P0)

**Critérios de Aceite:**
- [ ] `PATCH /subscriptions/:id/activate` muda para ATIVO (chamado pelo módulo payments)
- [ ] `PATCH /subscriptions/:id/suspend` muda para SUSPENSO (pagamento atrasado)
- [ ] `PATCH /subscriptions/:id/cancel` muda para CANCELADO, emite `PLANO_CANCELADO`
- [ ] `PATCH /subscriptions/:id/renew` estende `nextBillingDate` por `intervalDays`
- [ ] Status `CANCELADO` é terminal

### US-006.5 — Listar Assinaturas (Priority: P1)

**Critérios de Aceite:**
- [ ] `GET /subscriptions` com filtros: status, customerId, planId
- [ ] Paginado, scoped por tenant
- [ ] `GET /subscriptions/:id` retorna detalhes com plano e cliente

---

## Modelo de Dados

```
Plan:
  id              UUID PK
  tenant_id       UUID FK → tenants
  name            String
  description     String?
  price_cents     Integer (preço em centavos)
  interval_days   Integer (default 30)
  benefits        String[]
  active          Boolean @default(true)
  created_at      DateTime
  updated_at      DateTime

  INDEX(tenant_id)

Subscription:
  id               UUID PK
  tenant_id        UUID FK → tenants
  customer_id      UUID FK → customers
  plan_id          UUID FK → plans
  status           Enum: PENDENTE | ATIVO | SUSPENSO | CANCELADO
  started_at       DateTime?
  next_billing_at  DateTime?
  cancelled_at     DateTime?
  created_at       DateTime
  updated_at       DateTime

  INDEX(tenant_id, status)
  INDEX(tenant_id, customer_id)
  UNIQUE(tenant_id, customer_id) WHERE status IN ('ATIVO', 'PENDENTE')
```

---

## Eventos Emitidos

| Evento | Quando |
|--------|--------|
| `PLANO_ASSINADO` | Nova assinatura criada |
| `PLANO_CANCELADO` | Assinatura cancelada |

---

## Fora de Escopo

- Cobrança automática (Feature 007)
- Contrato digital com assinatura (futuro)
- Upgrades/downgrades de plano (futuro)
