# Tasks 007: Integração com Pagamentos

---

## Fase 1: Schema e Módulo

- [x] T007-01 Adicionar model Payment ao Prisma
- [x] T007-02 Rodar migration
- [x] T007-03 Criar PaymentsModule, PaymentsService, PaymentsController
- [x] T007-04 Criar interface PaymentGateway

## Fase 2: Mercado Pago Provider

- [x] T007-05 Instalar SDK do Mercado Pago
- [x] T007-06 Implementar MercadoPagoProvider com createPayment (PIX, CARD, BOLETO)
- [x] T007-07 Implementar verifyWebhook com HMAC
- [x] T007-08 Implementar getPaymentStatus

## Fase 3: Endpoints

- [x] T007-09 Implementar POST /payments (cria cobrança no gateway)
- [x] T007-10 Implementar POST /payments/webhook (processa notificação)
- [x] T007-11 Implementar lógica: webhook aprovado → ativa subscription → atualiza customer
- [x] T007-12 Implementar lógica: webhook recusado → emite evento
- [x] T007-13 Implementar idempotência no webhook
- [x] T007-14 Implementar GET /payments com filtros
- [x] T007-15 Implementar GET /customers/:id/payments

## Fase 4: Validação

- [x] T007-16 Testar: criação de pagamento PIX retorna QR code
- [x] T007-17 Testar: webhook duplicado não processa duas vezes
- [x] T007-18 Testar: webhook com assinatura inválida retorna 401
- [x] T007-19 Swagger documentado
- [x] T007-20 Seed com pagamentos de exemplo
