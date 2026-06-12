import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { Env } from '@common/config/env.schema';
import { SubscriptionsModule } from '@modules/subscriptions/subscriptions.module';
import { WhatsAppModule } from '@modules/whatsapp/whatsapp.module';
import { PrismaModule } from '@prisma/prisma.module';
import { AppointmentListener } from './listeners/appointment.listener';
import { CheckinListener } from './listeners/checkin.listener';
import { CustomerListener } from './listeners/customer.listener';
import { PaymentListener } from './listeners/payment.listener';
import { CheckinProcessor } from './processors/checkin.processor';
import { NotificationsProcessor } from './processors/notifications.processor';
import { PostAttendanceProcessor } from './processors/post-attendance.processor';
import { PostPaymentProcessor } from './processors/post-payment.processor';
import { PostRegistrationProcessor } from './processors/post-registration.processor';
import {
  QUEUE_NAMES,
  QUEUE_CHECKIN,
  QUEUE_NOTIFICATIONS,
  QUEUE_POST_ATTENDANCE,
  QUEUE_POST_PAYMENT,
  QUEUE_POST_REGISTRATION,
} from './queue.constants';

@Module({
  imports: [
    PrismaModule,
    SubscriptionsModule,
    WhatsAppModule,
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService<Env, true>) => {
        const password = configService.get('REDIS_PASSWORD', { infer: true });
        return {
          connection: {
            host: configService.get('REDIS_HOST', { infer: true }),
            port: configService.get('REDIS_PORT', { infer: true }),
            password: password || undefined,
          },
        };
      },
    }),
    BullModule.registerQueue(
      { name: QUEUE_POST_ATTENDANCE },
      { name: QUEUE_POST_PAYMENT },
      { name: QUEUE_POST_REGISTRATION },
      { name: QUEUE_NOTIFICATIONS },
      { name: QUEUE_CHECKIN },
    ),
  ],
  providers: [
    AppointmentListener,
    CheckinListener,
    PaymentListener,
    CustomerListener,
    CheckinProcessor,
    PostAttendanceProcessor,
    PostPaymentProcessor,
    PostRegistrationProcessor,
    NotificationsProcessor,
  ],
  exports: [BullModule],
})
export class QueueModule {}

// Re-export for consumers that need queue name validation
export { QUEUE_NAMES };
