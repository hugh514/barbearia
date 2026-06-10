# Tasks 003 — Gestão de Clientes e CRM Automático

**Input:** `specs/003-customer-crm/plan.md`

---

## Fase 1 — Schema e Módulo Base

- [ ] T003-01 Adicionar model `Customer` ao schema Prisma com enums
- [ ] T003-02 Rodar `prisma migrate dev --name add-customers`
- [ ] T003-03 Criar `CustomersModule`, `CustomersService`, `CustomersController`
- [ ] T003-04 Criar DTOs com validação Zod: `CreateCustomerDto`, `UpdateCustomerDto`, `CustomerQueryDto`
- [ ] T003-05 Criar `CustomerResponseDto` para serialização

## Fase 2 — CRUD

- [ ] T003-06 Implementar `POST /customers` com inferência de `tenantId` pelo JWT
- [ ] T003-07 Implementar constraint unique `(tenantId, phone)` com tratamento de 409
- [ ] T003-08 Implementar `GET /customers` com busca ILIKE em nome, telefone, instagram
- [ ] T003-09 Implementar paginação padrão reutilizável em `common/pagination`
- [ ] T003-10 Implementar `GET /customers/:id` com verificação de tenant
- [ ] T003-11 Implementar `PATCH /customers/:id` com partial update
- [ ] T003-12 Testar: telefone duplicado no tenant retorna 409
- [ ] T003-13 Testar: busca parcial por telefone funciona ("9999" encontra "11999998888")
- [ ] T003-14 Testar: acesso a cliente de outro tenant retorna 404

## Fase 3 — CRM Automático

- [ ] T003-15 Criar guard `InternalApiKeyGuard` que valida header `X-Internal-Key`
- [ ] T003-16 Implementar `POST /customers/upsert` com lógica find-or-create
- [ ] T003-17 Emitir evento `CLIENTE_CADASTRADO` via EventEmitter2 apenas na criação
- [ ] T003-18 Testar: upsert com telefone existente retorna cliente sem criar duplicata
- [ ] T003-19 Testar: upsert com telefone novo cria cliente e emite evento

## Fase 4 — Histórico e Conversas

- [ ] T003-20 Implementar `GET /customers/:id/history` (stub retornando array vazio até Feature 005)
- [ ] T003-21 Implementar `GET /customers/:id/conversations` (stub até Feature 004)
- [ ] T003-22 Documentar todos os endpoints no Swagger
- [ ] T003-23 Atualizar seed com 3-5 clientes de exemplo no tenant demo

## Fase 5 — Validação Final

- [ ] T003-24 CRUD completo funcional
- [ ] T003-25 Busca textual funciona em nome, telefone e instagram
- [ ] T003-26 CRM automático cria cliente sem duplicata
- [ ] T003-27 Paginação funcional em todas as listagens
- [ ] T003-28 Isolamento de tenant verificado
