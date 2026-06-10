# Tasks 008 — Sistema de Eventos e Filas

---

## Fase 1 — Setup BullMQ

- [ ] T008-01 Instalar @nestjs/bullmq, bullmq, @nestjs/event-emitter, eventemitter2
- [ ] T008-02 Criar QueueModule com configuração BullMQ conectando ao Redis
- [ ] T008-03 Registrar filas: post-attendance, post-payment, post-registration, notifications
- [ ] T008-04 Criar EventsModule com EventEmitterModule.forRoot()
- [ ] T008-05 Definir constantes de nomes de eventos em event-names.ts
- [ ] T008-06 Definir interfaces de payloads em event-payloads.ts

## Fase 2 — Listeners

- [ ] T008-07 Criar AppointmentListener que escuta ATENDIMENTO_FINALIZADO e enfileira job
- [ ] T008-08 Criar PaymentListener que escuta PAGAMENTO_APROVADO e PAGAMENTO_RECUSADO
- [ ] T008-09 Criar CustomerListener que escuta CLIENTE_CADASTRADO

## Fase 3 — Processors

- [ ] T008-10 Criar PostAttendanceProcessor: lógica de envio de avaliação + oferta de plano
- [ ] T008-11 Criar PostPaymentProcessor: ativar subscription + notificar cliente
- [ ] T008-12 Criar PostRegistrationProcessor: registrar métrica de lead
- [ ] T008-13 Implementar retry com backoff exponencial em todos os processors

## Fase 4 — Admin

- [ ] T008-14 Criar QueuesAdminModule com controller e service
- [ ] T008-15 Implementar GET /queues/stats
- [ ] T008-16 Implementar GET /queues/:name/failed

## Fase 5 — Integração e Validação

- [ ] T008-17 Conectar emissão de eventos no AppointmentsService (finish → ATENDIMENTO_FINALIZADO)
- [ ] T008-18 Conectar emissão no PaymentsService (webhook → PAGAMENTO_APROVADO/RECUSADO)
- [ ] T008-19 Conectar emissão no CustomersService (create → CLIENTE_CADASTRADO)
- [ ] T008-20 Testar: finalizar atendimento gera job na fila post-attendance
- [ ] T008-21 Testar: job falhado tenta retry 3 vezes
- [ ] T008-22 Testar: GET /queues/stats retorna contadores corretos
