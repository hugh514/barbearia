# Spec 007 — Integração com Pagamentos

**Branch:** `feat/007-payments-integration`
**Status:** Ready for Implementation
**Depende de:** `006-plans-subscriptions`

---

## Contexto

Clientes pagam planos mensais via PIX, cartão de crédito ou boleto. A API se integra com um gateway de pagamento (Mercado Pago — gratuito, popular no Brasil, suporta PIX nativo) via webhooks. O módulo de pagamentos nunca processa cartão diretamente — ele cria a cobrança no gateway e recebe a confirmação por webhook.

---

## User Stories

### US-007.1 — Criar Cobrança para Assinatura (Priority: P0)

**Como** sistema (ao criar assinatura),
**Quero** gerar uma cobrança no gateway de pagamento,
**Para que** o cliente receba o link/QR code de pagamento.

**Critérios de Aceite:**
- [ ] `POST /payments` aceita: subscriptionId, method (PIX, CARD, BOLETO)
- [ ] Cria cobrança no Mercado Pago via API
- [ ] Retorna: paymentId, externalId (ID do gateway), paymentUrl, qrCode (se PIX), status
- [ ] Status inicial: `PENDENTE`
- [ ] Apenas 1 payment PENDENTE por subscription por vez

### US-007.2 — Receber Webhook de Confirmação (Priority: P0)

**Como** gateway de pagamento,
**Quero** notificar a API quando um pagamento for aprovado ou recusado,
**Para que** a assinatura seja atualizada automaticamente.

**Critérios de Aceite:**
- [ ] `POST /payments/webhook` recebe notificação do Mercado Pago
- [ ] Valida assinatura HMAC do webhook
- [ ] Se aprovado: status → APROVADO, emite `PAGAMENTO_APROVADO`, ativa subscription
- [ ] Se recusado: status → RECUSADO, emite `PAGAMENTO_RECUSADO`
- [ ] Se expirado: status → EXPIRADO
- [ ] Idempotente: webhook duplicado não processa duas vezes (check externalId)

### US-007.3 — Consultar Pagamentos (Priority: P1)

**Critérios de Aceite:**
- [ ] `GET /payments` com filtros: subscriptionId, customerId, status, dateFrom, dateTo
- [ ] `GET /payments/:id` retorna detalhes incluindo dados do gateway
- [ ] Paginado, scoped por tenant

### US-007.4 — Histórico Financeiro do Cliente (Priority: P2)

**Critérios de Aceite:**
- [ ] `GET /customers/:id/payments` retorna pagamentos do cliente paginados
- [ ] Inclui: valor, data, status, método, plano associado

---

## Modelo de Dados

```
Payment:
  id              UUID PK
  tenant_id       UUID FK → tenants
  subscription_id UUID FK → subscriptions
  customer_id     UUID FK → customers
  external_id     String? UNIQUE (ID no gateway)
  method          Enum: PIX | CARD | BOLETO
  amount_cents    Integer
  status          Enum: PENDENTE | APROVADO | RECUSADO | EXPIRADO | REEMBOLSADO
  payment_url     String?
  qr_code         String? (PIX)
  gateway_data    Json? (resposta raw do gateway)
  paid_at         DateTime?
  created_at      DateTime
  updated_at      DateTime

  INDEX(tenant_id, status)
  INDEX(tenant_id, subscription_id)
  INDEX(tenant_id, customer_id)
  INDEX(external_id)
```

---

## Fluxo de Pagamento

```
1. POST /payments { subscriptionId, method: 'PIX' }
2. API cria preferência no Mercado Pago
3. Retorna QR code + link de pagamento
4. Cliente paga via app ou link
5. Mercado Pago envia webhook para POST /payments/webhook
6. API atualiza Payment + Subscription + Customer
```

---

## Configuração por Tenant

```
TenantSettings (futuro):
  mercado_pago_access_token  String (encrypted)
  mercado_pago_webhook_secret String (encrypted)
```

Para MVP, usar variáveis de ambiente globais. Multi-tenant payment config é futuro.

---

## Eventos Emitidos

| Evento | Quando |
|--------|--------|
| `PAGAMENTO_APROVADO` | Webhook confirma pagamento |
| `PAGAMENTO_RECUSADO` | Webhook rejeita pagamento |

---

## Fora de Escopo

- Cobrança recorrente automática (futuro — usar API de assinaturas do MP)
- Reembolso automático
- Split payment entre barbeiros
