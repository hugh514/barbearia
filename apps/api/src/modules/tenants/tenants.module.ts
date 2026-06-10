import { Module } from '@nestjs/common';
import { TenantsController } from '@modules/tenants/tenants.controller';

@Module({
  controllers: [TenantsController],
})
export class TenantsModule {}
