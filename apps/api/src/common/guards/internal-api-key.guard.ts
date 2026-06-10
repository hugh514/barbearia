import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import { Env } from '@common/config/env.schema';

export const INTERNAL_API_KEY_HEADER = 'x-internal-key';

@Injectable()
export class InternalApiKeyGuard implements CanActivate {
  constructor(private readonly configService: ConfigService<Env, true>) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const providedKey = request.headers[INTERNAL_API_KEY_HEADER];

    if (typeof providedKey !== 'string' || providedKey.length === 0) {
      throw new UnauthorizedException('Invalid internal API key');
    }

    const expectedKey = this.configService.get('INTERNAL_API_KEY', {
      infer: true,
    });

    if (providedKey !== expectedKey) {
      throw new UnauthorizedException('Invalid internal API key');
    }

    return true;
  }
}
