import { Module } from '@nestjs/common';
import { AppointmentsModule } from '@modules/appointments/appointments.module';
import { ConversationsModule } from '@modules/conversations/conversations.module';
import { PaymentsModule } from '@modules/payments/payments.module';
import { CustomersController } from '@modules/customers/customers.controller';
import { CustomersService } from '@modules/customers/customers.service';

@Module({
  imports: [ConversationsModule, AppointmentsModule, PaymentsModule],
  controllers: [CustomersController],
  providers: [CustomersService],
  exports: [CustomersService],
})
export class CustomersModule {}
