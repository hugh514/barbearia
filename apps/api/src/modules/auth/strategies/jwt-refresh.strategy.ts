import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { Env } from '@common/config/env.schema';
import { JwtRefreshPayload } from '@modules/auth/auth.types';

export interface RefreshTokenUser {
  userId: string;
  tenantId: string;
  jti: string;
}

@Injectable()
export class JwtRefreshStrategy extends PassportStrategy(
  Strategy,
  'jwt-refresh',
) {
  constructor(configService: ConfigService<Env, true>) {
    super({
      jwtFromRequest: ExtractJwt.fromBodyField('refreshToken'),
      ignoreExpiration: false,
      secretOrKey: configService.get('JWT_REFRESH_SECRET', { infer: true }),
      passReqToCallback: true,
    });
  }

  validate(
    req: { body?: { refreshToken?: string } },
    payload: JwtRefreshPayload,
  ): RefreshTokenUser {
    if (!payload.sub || !payload.tenantId || !payload.jti) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const tokenFromBody = req.body?.refreshToken;
    if (!tokenFromBody) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    return {
      userId: payload.sub,
      tenantId: payload.tenantId,
      jti: payload.jti,
    };
  }
}
