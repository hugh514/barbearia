import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { User, UserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import Redis from 'ioredis';
import { randomUUID } from 'crypto';
import { Env } from '@common/config/env.schema';
import { REDIS_CLIENT } from '@common/redis/redis.module';
import { PrismaService } from '@prisma/prisma.service';
import {
  BCRYPT_ROUNDS,
  REFRESH_TOKEN_TTL_SECONDS,
  refreshTokenKey,
} from '@modules/auth/auth.constants';
import { JwtPayload, JwtRefreshPayload } from '@modules/auth/auth.types';
import { SafeUser, withoutPasswordHash } from '@common/utils/user.util';

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

@Injectable()
export class AuthService {
  private readonly jwtSecret: string;
  private readonly jwtExpiresIn: string;
  private readonly refreshSecret: string;
  private readonly refreshExpiresIn: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService<Env, true>,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
  ) {
    this.jwtSecret = this.configService.get('JWT_SECRET', { infer: true });
    this.jwtExpiresIn = this.configService.get('JWT_EXPIRES_IN', {
      infer: true,
    });
    this.refreshSecret = this.configService.get('JWT_REFRESH_SECRET', {
      infer: true,
    });
    this.refreshExpiresIn = this.configService.get('JWT_REFRESH_EXPIRES_IN', {
      infer: true,
    });
  }

  async login(email: string, password: string): Promise<TokenPair> {
    const user = await this.prisma.user.findFirst({
      where: {
        email: email.toLowerCase(),
        active: true,
      },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const passwordValid = await bcrypt.compare(password, user.passwordHash);
    if (!passwordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    return this.generateTokenPair(user);
  }

  async refresh(refreshToken: string): Promise<TokenPair> {
    let payload: JwtRefreshPayload;

    try {
      payload = this.jwtService.verify<JwtRefreshPayload>(refreshToken, {
        secret: this.refreshSecret,
      });
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }

    if (!payload.sub || !payload.tenantId || !payload.jti) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const key = refreshTokenKey(payload.tenantId, payload.sub, payload.jti);
    const exists = await this.redis.get(key);

    if (!exists) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    await this.redis.del(key);

    const user = await this.prisma.user.findFirst({
      where: {
        id: payload.sub,
        tenantId: payload.tenantId,
        active: true,
      },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    return this.generateTokenPair(user);
  }

  async logout(
    tenantId: string,
    userId: string,
    refreshToken: string,
  ): Promise<void> {
    let payload: JwtRefreshPayload;

    try {
      payload = this.jwtService.verify<JwtRefreshPayload>(refreshToken, {
        secret: this.refreshSecret,
        ignoreExpiration: true,
      });
    } catch {
      return;
    }

    if (payload.sub !== userId || payload.tenantId !== tenantId) {
      return;
    }

    if (payload.jti) {
      const key = refreshTokenKey(tenantId, userId, payload.jti);
      await this.redis.del(key);
    }
  }

  async getMe(userId: string, tenantId: string): Promise<SafeUser> {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, tenantId, active: true },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    return withoutPasswordHash(user);
  }

  private async generateTokenPair(user: User): Promise<TokenPair> {
    const accessPayload: JwtPayload = {
      sub: user.id,
      tenantId: user.tenantId,
      role: user.role,
      email: user.email,
    };

    const jti = randomUUID();
    const refreshPayload: JwtRefreshPayload = {
      sub: user.id,
      tenantId: user.tenantId,
      jti,
    };

    const accessToken = this.jwtService.sign(
      { ...accessPayload },
      {
        secret: this.jwtSecret,
        expiresIn: this.jwtExpiresIn as `${number}${'s' | 'm' | 'h' | 'd'}`,
      },
    );

    const refreshToken = this.jwtService.sign(
      { ...refreshPayload },
      {
        secret: this.refreshSecret,
        expiresIn: this.refreshExpiresIn as `${number}${'s' | 'm' | 'h' | 'd'}`,
      },
    );

    const key = refreshTokenKey(user.tenantId, user.id, jti);
    await this.redis.set(key, '1', 'EX', REFRESH_TOKEN_TTL_SECONDS);

    return { accessToken, refreshToken };
  }

  async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, BCRYPT_ROUNDS);
  }

  canCreateRole(creatorRole: UserRole, targetRole: UserRole): boolean {
    if (creatorRole === UserRole.ADMIN) {
      return (
        targetRole === UserRole.ADMIN ||
        targetRole === UserRole.GERENTE ||
        targetRole === UserRole.BARBEIRO
      );
    }

    if (creatorRole === UserRole.GERENTE) {
      return targetRole === UserRole.BARBEIRO;
    }

    return false;
  }
}
