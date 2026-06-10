import {
  BadRequestException,
  createParamDecorator,
  ExecutionContext,
} from '@nestjs/common';
import { Request } from 'express';

export const TENANT_ID_HEADER = 'x-tenant-id';

export const TenantHeader = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): string => {
    const request = ctx.switchToHttp().getRequest<Request>();
    const tenantId = request.headers[TENANT_ID_HEADER];

    if (typeof tenantId !== 'string' || tenantId.length === 0) {
      throw new BadRequestException('X-Tenant-Id header is required');
    }

    return tenantId;
  },
);
