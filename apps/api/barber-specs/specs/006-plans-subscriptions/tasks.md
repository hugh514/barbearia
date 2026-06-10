# Tasks 006 — Planos e Assinaturas

---

## Fase 1 — Schema

- [ ] T006-01 Adicionar models Plan e Subscription ao Prisma
- [ ] T006-02 Rodar migration

## Fase 2 — Plans CRUD

- [ ] T006-03 Criar PlansModule, PlansService, PlansController
- [ ] T006-04 Implementar POST /plans (ADMIN only)
- [ ] T006-05 Implementar GET /plans com filtro active
- [ ] T006-06 Implementar PATCH /plans/:id
- [ ] T006-07 Implementar DELETE /plans/:id (soft-disable)

## Fase 3 — Subscriptions

- [ ] T006-08 Criar SubscriptionsModule, SubscriptionsService, SubscriptionsController
- [ ] T006-09 Implementar POST /subscriptions com validação de unicidade
- [ ] T006-10 Implementar GET /subscriptions com filtros
- [ ] T006-11 Implementar transições: activate, suspend, cancel, renew
- [ ] T006-12 Sincronizar customer.planStatus ao mudar status da subscription
- [ ] T006-13 Emitir PLANO_ASSINADO e PLANO_CANCELADO

## Fase 4 — Validação

- [ ] T006-14 Testar: cliente com assinatura ativa não pode assinar novamente (409)
- [ ] T006-15 Testar: cancelamento atualiza customer.planStatus
- [ ] T006-16 Swagger documentado
- [ ] T006-17 Seed com planos e assinaturas de exemplo
