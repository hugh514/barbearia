# Tasks 006 — Planos e Assinaturas

---

## Fase 1 — Schema

- [x] T006-01 Adicionar models Plan e Subscription ao Prisma
- [x] T006-02 Rodar migration

## Fase 2 — Plans CRUD

- [x] T006-03 Criar PlansModule, PlansService, PlansController
- [x] T006-04 Implementar POST /plans (ADMIN only)
- [x] T006-05 Implementar GET /plans com filtro active
- [x] T006-06 Implementar PATCH /plans/:id
- [x] T006-07 Implementar DELETE /plans/:id (soft-disable)

## Fase 3 — Subscriptions

- [x] T006-08 Criar SubscriptionsModule, SubscriptionsService, SubscriptionsController
- [x] T006-09 Implementar POST /subscriptions com validação de unicidade
- [x] T006-10 Implementar GET /subscriptions com filtros
- [x] T006-11 Implementar transições: activate, suspend, cancel, renew
- [x] T006-12 Sincronizar customer.planStatus ao mudar status da subscription
- [x] T006-13 Emitir PLANO_ASSINADO e PLANO_CANCELADO

## Fase 4 — Validação

- [x] T006-14 Testar: cliente com assinatura ativa não pode assinar novamente (409)
- [x] T006-15 Testar: cancelamento atualiza customer.planStatus
- [x] T006-16 Swagger documentado
- [x] T006-17 Seed com planos e assinaturas de exemplo
