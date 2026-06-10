# Tasks 007 — Integração com Pagamentos

---

## Fase 1 — Schema e Módulo

- [ ] T007-01 Adicionar model Payment ao Prisma
- [ ] T007-02 Rodar migration
- [ ] T007-03 Criar PaymentsModule, PaymentsService, PaymentsController
- [ ] T007-04 Criar interface PaymentGateway

## Fase 2 — Mercado Pago Provider

- [ ] T007-05 Instalar SDK do Mercado Pago
- [ ] T007-06 Implementar MercadoPagoProvider com createPayment (PIX, CARD, BOLETO)
- [ ] T007-07 Implementar verifyWebhook com HMAC
- [ ] T007-08 Implementar getPaymentStatus

## Fase 3 — Endpoints

- [ ] T007-09 Implementar POST /payments (cria cobrança no gateway)
- [ ] T007-10 Implementar POST /payments/webhook (processa notificação)
- [ ] T007-11 Implementar lógica: webhook aprovado → ativa subscription → atualiza customer
- [ ] T007-12 Implementar lógica: webhook recusado → emite evento
- [ ] T007-13 Implementar idempotência no webhook
- [ ] T007-14 Implementar GET /payments com filtros
- [ ] T007-15 Implementar GET /customers/:id/payments

## Fase 4 — Validação

- [ ] T007-16 Testar: criação de pagamento PIX retorna QR code
- [ ] T007-17 Testar: webhook duplicado não processa duas vezes
- [ ] T007-18 Testar: webhook com assinatura inválida retorna 401
- [ ] T007-19 Swagger documentado
- [ ] T007-20 Seed com pagamentos de exemplo
