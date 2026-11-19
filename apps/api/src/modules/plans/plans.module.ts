import { Module } from '@nestjs/common';
import { PlansController } from '@modules/plans/plans.controller';
import { PlansService } from '@modules/plans/plans.service';

@Module({
  controllers: [PlansController],
  providers: [PlansService],
  exports: [PlansService],
})
export class PlansModule {}
