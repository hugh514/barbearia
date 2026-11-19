# Plano Técnico 005: Atendimentos (Walk-in)

**Input:** `specs/005-appointments-attendance/spec.md`

---

## Verificação Constitucional

| Artigo | Status | Nota |
|--------|--------|------|
| I, API como Hub | sim | Atendimentos gerenciados pela API |
| II, Multi-tenancy | sim | tenant_id em Appointment |
| IV, Orientação a Eventos | sim | ATENDIMENTO_FINALIZADO vai para fila |
| X, Ordem de chegada | sim | Sem slots, sem agenda, só fila por createdAt |

---

## Estrutura de Diretórios

```
src/modules/appointments/
  appointments.module.ts
  appointments.controller.ts
  appointments.service.ts
  dto/
    create-appointment.dto.ts
    finish-appointment.dto.ts
    cancel-appointment.dto.ts
    appointment-query.dto.ts
    appointment-response.dto.ts
```

## Schema Prisma

```prisma
model Appointment {
  id           String            @id @default(uuid())
  tenantId     String            @map("tenant_id")
  tenant       Tenant            @relation(fields: [tenantId], references: [id])
  customerId   String            @map("customer_id")
  customer     Customer          @relation(fields: [customerId], references: [id])
  barberId     String?           @map("barber_id")
  barber       User?             @relation(fields: [barberId], references: [id])
  status       AppointmentStatus @default(AGUARDANDO)
  services     String[]
  totalPrice   Decimal?          @map("total_price") @db.Decimal(10, 2)
  notes        String?
  cancelReason String?           @map("cancel_reason")
  startedAt    DateTime?         @map("started_at")
  finishedAt   DateTime?         @map("finished_at")
  createdAt    DateTime          @default(now()) @map("created_at")
  updatedAt    DateTime          @updatedAt @map("updated_at")

  @@index([tenantId, status])
  @@index([tenantId, barberId])
  @@index([tenantId, customerId])
  @@index([tenantId, createdAt])
  @@map("appointments")
}

enum AppointmentStatus {
  AGUARDANDO
  EM_ATENDIMENTO
  FINALIZADO
  CANCELADO
}
```

## Regras de Transição de Status

```
AGUARDANDO → EM_ATENDIMENTO (start)
AGUARDANDO → CANCELADO (cancel)
EM_ATENDIMENTO → FINALIZADO (finish)
EM_ATENDIMENTO → CANCELADO (cancel)
FINALIZADO → (terminal)
CANCELADO → (terminal)
```

## Validação de Barbeiro Único

Ao iniciar atendimento, verificar:
```sql
SELECT count(*) FROM appointments
WHERE tenant_id = $1 AND barber_id = $2 AND status = 'EM_ATENDIMENTO'
```
Se count > 0, retorna 409: "Barbeiro já está em atendimento".

---

## Endpoints

| Método | Rota | Roles | Descrição |
|--------|------|-------|-----------|
| POST | `/appointments` | BARBEIRO, GERENTE, ADMIN | Registrar chegada |
| GET | `/appointments/queue` | BARBEIRO, GERENTE, ADMIN | Fila do dia |
| GET | `/appointments` | GERENTE, ADMIN | Histórico com filtros |
| GET | `/appointments/:id` | BARBEIRO, GERENTE, ADMIN | Detalhes |
| PATCH | `/appointments/:id/start` | BARBEIRO, GERENTE, ADMIN | Iniciar |
| PATCH | `/appointments/:id/finish` | BARBEIRO, GERENTE, ADMIN | Finalizar |
| PATCH | `/appointments/:id/cancel` | BARBEIRO, GERENTE, ADMIN | Cancelar |
