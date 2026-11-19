import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Env } from '@common/config/env.schema';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { MockPaymentProvider } from './providers/mock-payment.provider';
import { MercadoPagoProvider } from './providers/mercado-pago.provider';
import { PAYMENT_GATEWAY } from './providers/payment-gateway.interface';

@Module({
  controllers: [PaymentsController],
  providers: [
    PaymentsService,
    MercadoPagoProvider,
    MockPaymentProvider,
    {
      provide: PAYMENT_GATEWAY,
      inject: [ConfigService, MercadoPagoProvider, MockPaymentProvider],
      useFactory: (
        config: ConfigService<Env, true>,
        mercadoPago: MercadoPagoProvider,
        mock: MockPaymentProvider,
      ) =>
        config.get('PAYMENTS_PROVIDER', { infer: true }) === 'mock'
          ? mock
          : mercadoPago,
    },
  ],
  exports: [PaymentsService],
})
export class PaymentsModule {}
