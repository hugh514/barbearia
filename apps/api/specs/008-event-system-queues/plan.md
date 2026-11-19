# Plano Técnico 008: Sistema de Eventos e Filas

---

## Estrutura

```
src/
  queue/
    queue.module.ts
    processors/
      post-attendance.processor.ts
      post-payment.processor.ts
      post-registration.processor.ts
      notifications.processor.ts
    listeners/
      appointment.listener.ts
      payment.listener.ts
      customer.listener.ts
  events/
    events.module.ts
    event-names.ts
    interfaces/
      event-payloads.ts
  modules/
    queues-admin/
      queues-admin.module.ts
      queues-admin.controller.ts
      queues-admin.service.ts
```

## Event Payloads

```typescript
interface AtendimentoFinalizadoPayload {
  tenantId: string;
  appointmentId: string;
  customerId: string;
  barberId: string;
}

interface PagamentoAprovadoPayload {
  tenantId: string;
  paymentId: string;
  subscriptionId: string;
  customerId: string;
}

interface ClienteCadastradoPayload {
  tenantId: string;
  customerId: string;
  origin: 'MANUAL' | 'WHATSAPP' | 'INSTAGRAM';
}
```

## Retry Strategy

```typescript
{
  attempts: 3,
  backoff: { type: 'exponential', delay: 60000 } // 1min, 2min, 4min
}
```

---

## Pacotes

```bash
npm install @nestjs/bullmq bullmq @nestjs/event-emitter eventemitter2
```

---

## Endpoints

| Método | Rota | Roles |
|--------|------|-------|
| GET | `/queues/stats` | ADMIN |
| GET | `/queues/:name/failed` | ADMIN |
