import { Module } from '@nestjs/common';
import { QueueModule } from '../../queue/queue.module';
import { QueuesAdminController } from './queues-admin.controller';
import { QueuesAdminService } from './queues-admin.service';

@Module({
  imports: [QueueModule],
  controllers: [QueuesAdminController],
  providers: [QueuesAdminService],
})
export class QueuesAdminModule {}
