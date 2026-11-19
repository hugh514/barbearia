# Tasks 005: Atendimentos (Walk-in)

**Input:** `specs/005-appointments-attendance/plan.md`

---

## Fase 1: Schema

- [x] T005-01 Adicionar model `Appointment` ao Prisma com enum `AppointmentStatus`
- [x] T005-02 Rodar `prisma migrate dev --name add-appointments`

## Fase 2: Módulo e CRUD

- [x] T005-03 Criar `AppointmentsModule`, `AppointmentsService`, `AppointmentsController`
- [x] T005-04 Criar DTOs com validação Zod
- [x] T005-05 Implementar `POST /appointments` (status AGUARDANDO, verificar customer existe)
- [x] T005-06 Implementar `GET /appointments/queue` (filtro: hoje, status AGUARDANDO + EM_ATENDIMENTO)
- [x] T005-07 Implementar `GET /appointments` com filtros e paginação
- [x] T005-08 Implementar `GET /appointments/:id` com verificação de tenant

## Fase 3: Transições de Status

- [x] T005-09 Implementar `PATCH /appointments/:id/start` com validação de status e barbeiro único
- [x] T005-10 Implementar `PATCH /appointments/:id/finish` com totalPrice e notes opcionais
- [x] T005-11 Implementar `PATCH /appointments/:id/cancel` com reason opcional
- [x] T005-12 Emitir evento `ATENDIMENTO_INICIADO` no start
- [x] T005-13 Emitir evento `ATENDIMENTO_FINALIZADO` no finish
- [x] T005-14 Atualizar `customer.lastVisit` ao finalizar atendimento

## Fase 4: Integração

- [x] T005-15 Atualizar `GET /customers/:id/history` para retornar atendimentos reais
- [x] T005-16 Testar: barbeiro com atendimento ativo não pode iniciar outro (409)
- [x] T005-17 Testar: transição inválida (FINALIZADO → CANCELADO) retorna 422
- [x] T005-18 Documentar endpoints no Swagger
- [x] T005-19 Atualizar seed com atendimentos de exemplo

## Fase 5: Validação Final

- [x] T005-20 Fila do dia funcional e ordenada por chegada
- [x] T005-21 Transições de status respeitam regras
- [x] T005-22 Eventos emitidos corretamente
- [x] T005-23 Histórico do cliente atualizado
