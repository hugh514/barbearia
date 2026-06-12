import { Module } from '@nestjs/common';
import { AppointmentsModule } from '@modules/appointments/appointments.module';
import { ConversationsModule } from '@modules/conversations/conversations.module';
import { CustomersController } from '@modules/customers/customers.controller';
import { CustomersService } from '@modules/customers/customers.service';

@Module({
  imports: [ConversationsModule, AppointmentsModule],
  controllers: [CustomersController],
  providers: [CustomersService],
  exports: [CustomersService],
})
export class CustomersModule {}
