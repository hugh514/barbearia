import { Module } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { AppointmentsModule } from '@modules/appointments/appointments.module';
import { CheckinController } from '@modules/checkin/checkin.controller';
import { CheckinService } from '@modules/checkin/checkin.service';

@Module({
  imports: [AppointmentsModule, EventEmitterModule],
  controllers: [CheckinController],
  providers: [CheckinService],
})
export class CheckinModule {}
