# Tasks 011: Check-in por QR Code

**Input:** `specs/011-qr-checkin/plan.md` · `specs/011-qr-checkin/spec.md`

---

## Fase 1: Setup do Módulo

**Objetivo**: Criar a estrutura base do módulo `checkin` e registrá-lo na aplicação.

- [x] T011-01 Criar `src/modules/checkin/checkin.module.ts` importando `PrismaModule` (global), `RedisModule` (global), `AppointmentsModule` e `EventEmitterModule`; registrar `CheckinService` e `CheckinController`
- [x] T011-02 Registrar `CheckinModule` em `src/app.module.ts` na lista de `imports`

---

## Fase 2: Evento de Domínio

**Objetivo**: Definir o contrato do evento `CHECKIN_REALIZADO` antes do service que o emite.

- [x] T011-03 Criar `src/common/events/checkin.events.ts` com a constante `CHECKIN_REALIZADO` e a interface `CheckinRealizadoPayload` (`tenantId`, `customerId`, `appointmentId`, `reused`, `checkedInAt`)

---

## Fase 3: DTOs e Validação

**Objetivo**: Definir os contratos de entrada e saída com Zod, no padrão do projeto.

- [x] T011-04 Criar `src/modules/checkin/dto/generate-token-response.dto.ts` com campos `token: string` e `expiresInSeconds: number`
- [x] T011-05 Criar `src/modules/checkin/dto/consume-token.dto.ts` com schema Zod (`token: z.string().min(1)`), exportando `ConsumeTokenDto` e `consumeTokenSchema`
- [x] T011-06 Criar `src/modules/checkin/dto/checkin-response.dto.ts` com campos `appointment: AppointmentResponseDto`, `queuePosition: number` e `reused: boolean`

---

## Fase 4: US1: Geração de Token (CLIENTE)

**Objetivo**: Implementar `POST /checkin/token`, cliente gera token efêmero; regeneração invalida o anterior.

**Independent Test**: Autenticar como CLIENTE → `POST /checkin/token` → receber `{ token, expiresInSeconds: 60 }`; chamar novamente → novo token, anterior inválido.

- [x] T011-07 Implementar lógica de geração de token em `src/modules/checkin/checkin.service.ts`:
  - Injetar `PrismaService` e `REDIS_CLIENT` (ioredis)
  - Método `generateToken(userId: string, tenantId: string): Promise<GenerateTokenResponseDto>`
  - Buscar `user.customerId` via Prisma; lançar 422 se nulo
  - Validar que `Customer` existe, `tenantId` bate e `active = true`
  - `crypto.randomBytes(32).toString('hex')` para gerar token
  - Pipeline Redis: GET chave reversa → DEL token anterior (se existir) → SET token (EX 60) → SET reversa (EX 65)
  - Retornar `{ token, expiresInSeconds: 60 }`
- [x] T011-08 Implementar `CheckinController` em `src/modules/checkin/checkin.controller.ts`:
  - `@ApiTags('checkin')`, `@Controller('checkin')`, `@ApiBearerAuth`
  - `@Post('token')` com `@Roles(UserRole.CLIENTE)`, `@HttpCode(201)`, `@Throttle({ checkin: { limit: 10, ttl: 60000 } })`
  - Extrair `tenantId` e `userId` via `@CurrentTenant()` e `@CurrentUser()`
  - Chamar `checkinService.generateToken(userId, tenantId)`
  - Decoradores Swagger: `@ApiOperation`, `@ApiResponse(201)`, `@ApiResponse(403)`, `@ApiResponse(422)`

---

## Fase 5: US2: Consumo Atômico de Token (BARBEIRO/GERENTE/ADMIN)

**Objetivo**: Implementar `POST /checkin/consume`, consumo atômico, criação de atendimento walk-in, cálculo de posição na fila.

**Independent Test**: Gerar token como CLIENTE → consumir como BARBEIRO → verificar atendimento criado com `status: AGUARDANDO` e `queuePosition` correto na resposta.

- [x] T011-09 Implementar método `consumeToken(token: string, tenantId: string): Promise<CheckinResponseDto>` em `CheckinService`:
  - `GETDEL checkin:{tenantId}:{token}` → `customerId | null`; null → lança `NotFoundException('Token inválido ou expirado')`
  - `DEL checkin:customer:{tenantId}:{customerId}` (limpeza da chave reversa)
  - Buscar `Customer` via Prisma com `id = customerId AND tenantId = tenantId AND active = true`; não encontrado → lança `UnprocessableEntityException('Cliente não encontrado ou inativo')`
  - Buscar atendimento aberto do dia: `status IN [AGUARDANDO, EM_ATENDIMENTO] AND tenantId AND customerId AND createdAt >= startOfDay AND createdAt <= endOfDay`
  - Se encontrado: `reused = true`; se não: criar `Appointment` via `prisma.appointment.create({ data: { tenantId, customerId, status: AGUARDANDO } })`
  - Calcular `queuePosition`: `prisma.appointment.count({ where: { tenantId, status: { in: QUEUE_STATUSES }, createdAt: { gte: startOfDay, lte: endOfDay, lte: appointment.createdAt } } })`, count de atendimentos na fila com `createdAt <= appointment.createdAt`
  - Emitir `eventEmitter.emit(CHECKIN_REALIZADO, payload: CheckinRealizadoPayload)`
  - Retornar `{ appointment: toAppointmentResponse(appointment), queuePosition, reused }`
- [x] T011-10 Adicionar endpoint `POST /checkin/consume` em `CheckinController`:
  - `@Roles(UserRole.ADMIN, UserRole.GERENTE, UserRole.BARBEIRO)`, `@HttpCode(200)`, `@Throttle({ checkin: { limit: 30, ttl: 60000 } })`
  - `@Body(new ZodValidationPipe(consumeTokenSchema)) body: ConsumeTokenDto`
  - Decoradores Swagger: `@ApiOperation`, `@ApiResponse(200)`, `@ApiResponse(404)`, `@ApiResponse(422)`

---

## Fase 6: US3: Idempotência de Fila (atendimento aberto)

**Objetivo**: Garantir que consumo de token de cliente com atendimento aberto retorna o existente sem criar duplicata.

**Independent Test**: Fazer check-in → verificar atendimento A; gerar novo token e consumir → resposta retorna o mesmo atendimento A com `reused: true`.

> Esta fase não requer código novo, a lógica de idempotência já está embutida no método `consumeToken` (T011-09). Esta fase é de validação e teste.

- [x] T011-11 Validar (via testes e2e na Fase 7) o cenário de atendimento já aberto: dois check-ins do mesmo cliente no mesmo dia resultam em `reused: true` na segunda resposta e exatamente um `Appointment` no banco

---

## Fase 7: Listener e Processor BullMQ

**Objetivo**: Desacoplar efeitos colaterais do handler HTTP via BullMQ, no padrão da Feature 008.

- [x] T011-12 Criar `src/queue/listeners/checkin.listener.ts`:
  - `@Injectable()` com `@OnEvent(CHECKIN_REALIZADO)`
  - Injetar `Queue` da fila `checkin` (via `@InjectQueue('checkin')`)
  - Método `handleCheckinRealizado(payload: CheckinRealizadoPayload)`: adicionar job `'checkin.realizado'` com `{ attempts: 3, backoff: { type: 'exponential', delay: 60000 } }`
- [x] T011-13 Criar `src/queue/processors/checkin.processor.ts`:
  - `@Processor('checkin')` com `@Process('checkin.realizado')`
  - Receber `CheckinRealizadoPayload`; logar evento (Pino); estrutura pronta para extensão futura (notificações push, métricas)
- [x] T011-14 Registrar fila `checkin` em `src/queue/queue.module.ts` via `BullModule.registerQueue({ name: 'checkin' })` e adicionar `CheckinListener` e `CheckinProcessor` aos providers

---

## Fase 8: Testes E2E

**Objetivo**: Cobrir todos os Acceptance Scenarios da spec com testes e2e no arquivo `test/feature-011.e2e-spec.ts`.

- [x] T011-15 Criar `test/feature-011.e2e-spec.ts` com setup de `AppModule`, `PrismaService` e usuários de teste (CLIENTE com `customerId` vinculado, BARBEIRO, ADMIN de outro tenant para cross-tenant):
  - **US1-AC1**: CLIENTE gera token → resposta contém `token` (string 64 chars) e `expiresInSeconds: 60`
  - **US1-AC2**: CLIENTE gera segundo token → token anterior não é consumível (GETDEL retorna null); novo token consumível
  - **US1-AC3**: ADMIN/GERENTE/BARBEIRO tenta `POST /checkin/token` → 403
  - **US2-AC1**: Token válido consumido por BARBEIRO → Appointment criado com `status AGUARDANDO`, `customerId` correto, `queuePosition >= 1`
  - **US2-AC2**: Token expirado (aguardar TTL ou deletar manualmente do Redis) → 404
  - **US2-AC3**: Token já consumido → segunda tentativa retorna 404
  - **US2-AC4**: Token do tenant A consumido pelo BARBEIRO do tenant B → 404 (cross-tenant bloqueado)
  - **US2-AC5**: Evento `CHECKIN_REALIZADO` emitido (spy no EventEmitter2)
  - **US3-AC1**: Segundo check-in do mesmo cliente no mesmo dia → `reused: true`, nenhum Appointment novo
  - **US3-AC2**: Cliente cujo atendimento do dia está finalizado/cancelado → novo Appointment criado, `reused: false`
  - **Edge case**: Cliente inativo entre geração e consumo → 422
  - **Edge case**: CLIENTE sem `customerId` vinculado → 422 em `POST /checkin/token`

---

## Fase 9: Swagger e Documentação

**Objetivo**: Documentar os endpoints no Swagger e marcar a feature completa.

- [x] T011-16 Verificar que `@ApiTags('checkin')`, `@ApiOperation`, `@ApiResponse` e `@ApiBearerAuth` estão aplicados em ambos os endpoints; confirmar que `/docs` exibe os dois endpoints com payloads de exemplo
- [x] T011-17 Atualizar `specs/011-qr-checkin/tasks.md` marcando todas as tasks `[x]` após validação final (fila funcional, testes passando, Swagger correto)

---

## Ordem de Execução e Dependências

```
T011-01 → T011-02                   (setup do módulo)
T011-03                              (evento, independente, pode ser paralelo com T011-01)
T011-04, T011-05, T011-06            (DTOs, paralelos entre si, dependem de T011-01)
T011-07 → T011-08                   (US1: service → controller)
T011-09 → T011-10                   (US2: service → controller; depende de T011-07)
T011-11                              (validação US3, sem código novo; depende de T011-09)
T011-12 → T011-13 → T011-14         (BullMQ; depende de T011-03 e T011-09)
T011-15                              (e2e; depende de T011-08, T011-10, T011-14)
T011-16 → T011-17                   (documentação e fechamento)
```

**Checkpoint MVP** (após T011-10): `POST /checkin/token` e `POST /checkin/consume` funcionais com isolamento multi-tenant e uso único.

**Checkpoint Final** (após T011-17): testes e2e passando, Swagger atualizado, evento BullMQ integrado.
