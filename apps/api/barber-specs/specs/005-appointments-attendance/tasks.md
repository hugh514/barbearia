# Tasks 005 — Atendimentos (Walk-in)

**Input:** `specs/005-appointments-attendance/plan.md`

---

## Fase 1 — Schema

- [ ] T005-01 Adicionar model `Appointment` ao Prisma com enum `AppointmentStatus`
- [ ] T005-02 Rodar `prisma migrate dev --name add-appointments`

## Fase 2 — Módulo e CRUD

- [ ] T005-03 Criar `AppointmentsModule`, `AppointmentsService`, `AppointmentsController`
- [ ] T005-04 Criar DTOs com validação Zod
- [ ] T005-05 Implementar `POST /appointments` (status AGUARDANDO, verificar customer existe)
- [ ] T005-06 Implementar `GET /appointments/queue` (filtro: hoje, status AGUARDANDO + EM_ATENDIMENTO)
- [ ] T005-07 Implementar `GET /appointments` com filtros e paginação
- [ ] T005-08 Implementar `GET /appointments/:id` com verificação de tenant

## Fase 3 — Transições de Status

- [ ] T005-09 Implementar `PATCH /appointments/:id/start` com validação de status e barbeiro único
- [ ] T005-10 Implementar `PATCH /appointments/:id/finish` com totalPrice e notes opcionais
- [ ] T005-11 Implementar `PATCH /appointments/:id/cancel` com reason opcional
- [ ] T005-12 Emitir evento `ATENDIMENTO_INICIADO` no start
- [ ] T005-13 Emitir evento `ATENDIMENTO_FINALIZADO` no finish
- [ ] T005-14 Atualizar `customer.lastVisit` ao finalizar atendimento

## Fase 4 — Integração

- [ ] T005-15 Atualizar `GET /customers/:id/history` para retornar atendimentos reais
- [ ] T005-16 Testar: barbeiro com atendimento ativo não pode iniciar outro (409)
- [ ] T005-17 Testar: transição inválida (FINALIZADO → CANCELADO) retorna 422
- [ ] T005-18 Documentar endpoints no Swagger
- [ ] T005-19 Atualizar seed com atendimentos de exemplo

## Fase 5 — Validação Final

- [ ] T005-20 Fila do dia funcional e ordenada por chegada
- [ ] T005-21 Transições de status respeitam regras
- [ ] T005-22 Eventos emitidos corretamente
- [ ] T005-23 Histórico do cliente atualizado
