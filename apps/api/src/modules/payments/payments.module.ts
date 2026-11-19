import { Module } from '@nestjs/common';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { MercadoPagoProvider } from './providers/mercado-pago.provider';
import { PAYMENT_GATEWAY } from './providers/payment-gateway.interface';

@Module({
  controllers: [PaymentsController],
  providers: [
    PaymentsService,
    MercadoPagoProvider,
    {
      provide: PAYMENT_GATEWAY,
      useExisting: MercadoPagoProvider,
    },
  ],
  exports: [PaymentsService],
})
export class PaymentsModule {}
