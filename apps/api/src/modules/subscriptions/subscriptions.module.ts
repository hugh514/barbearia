import { Module } from '@nestjs/common';
import { SubscriptionsController } from '@modules/subscriptions/subscriptions.controller';
import { SubscriptionsService } from '@modules/subscriptions/subscriptions.service';

@Module({
  controllers: [SubscriptionsController],
  providers: [SubscriptionsService],
  exports: [SubscriptionsService],
})
export class SubscriptionsModule {}
