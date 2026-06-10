# Plano Técnico 007 — Integração com Pagamentos

**Input:** `specs/007-payments-integration/spec.md`

---

## Estrutura

```
src/modules/payments/
  payments.module.ts
  payments.controller.ts
  payments.service.ts
  providers/
    mercado-pago.provider.ts    # Abstração do gateway
    payment-gateway.interface.ts # Interface para trocar gateway
  dto/
    create-payment.dto.ts
    payment-response.dto.ts
    webhook-payload.dto.ts
```

## Abstração do Gateway

```typescript
interface PaymentGateway {
  createPayment(data: CreateGatewayPayment): Promise<GatewayPaymentResult>;
  verifyWebhook(headers: Record<string, string>, body: unknown): boolean;
  getPaymentStatus(externalId: string): Promise<GatewayPaymentStatus>;
}
```

O `MercadoPagoProvider` implementa essa interface. Se no futuro trocar para Stripe, só troca o provider.

## Webhook Security

- Rota `POST /payments/webhook` é pública (sem JWT)
- Validação via HMAC-SHA256 no header `x-signature` do Mercado Pago
- Se assinatura inválida, retorna 401

## Idempotência

Antes de processar webhook, verificar:
```sql
SELECT * FROM payments WHERE external_id = $1
```
Se payment.status já é terminal (APROVADO, RECUSADO), ignorar.

---

## Pacotes

```bash
npm install mercadopago
```

---

## Endpoints

| Método | Rota | Auth |
|--------|------|------|
| POST | `/payments` | JWT (ADMIN, GERENTE, CLIENTE) |
| GET | `/payments` | JWT (ADMIN, GERENTE) |
| GET | `/payments/:id` | JWT |
| POST | `/payments/webhook` | HMAC validation |
| GET | `/customers/:id/payments` | JWT (ADMIN, GERENTE) |
