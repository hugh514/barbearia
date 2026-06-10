# Tasks 009 — Dashboard e Métricas

---

## Fase 1 — Módulo e Helpers

- [ ] T009-01 Criar DashboardModule, DashboardService, DashboardController
- [ ] T009-02 Criar enum Period e helper getDateRange
- [ ] T009-03 Criar decorator @CacheMetric com Redis TTL
- [ ] T009-04 Criar DTOs de response para cada endpoint

## Fase 2 — Endpoints

- [ ] T009-05 Implementar GET /dashboard/summary com agregações de atendimentos
- [ ] T009-06 Implementar GET /dashboard/customers com contagem e recorrência
- [ ] T009-07 Implementar GET /dashboard/revenue com soma de atendimentos + pagamentos
- [ ] T009-08 Implementar GET /dashboard/plans com MRR e churn
- [ ] T009-09 Implementar GET /dashboard/conversations com contagem por status e canal
- [ ] T009-10 Implementar GET /dashboard/barbers com performance individual

## Fase 3 — Cache e Performance

- [ ] T009-11 Implementar cache Redis em todos os endpoints com TTL 5min
- [ ] T009-12 Testar: queries com 1000+ registros retornam em < 500ms
- [ ] T009-13 Verificar isolamento de tenant em todas as agregações

## Fase 4 — Validação

- [ ] T009-14 Testar: summary retorna dados corretos para today/week/month
- [ ] T009-15 Testar: BARBEIRO não acessa dashboard (403)
- [ ] T009-16 Swagger documentado com exemplos de response
- [ ] T009-17 Seed com dados suficientes para métricas não-zero
