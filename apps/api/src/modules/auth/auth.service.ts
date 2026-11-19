import {
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { CustomerOrigin, User, UserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import Redis from 'ioredis';
import { randomUUID } from 'crypto';
import { Env } from '@common/config/env.schema';
import { REDIS_CLIENT } from '@common/redis/redis.module';
import { PrismaService } from '@prisma/prisma.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  BCRYPT_ROUNDS,
  REFRESH_TOKEN_TTL_SECONDS,
  PASSWORD_RESET_TTL_SECONDS,
  refreshTokenKey,
  refreshTokenPattern,
  passwordResetKey,
} from '@modules/auth/auth.constants';
import { SENHA_RECUPERACAO_SOLICITADA } from '../../events/event-names';
import { JwtPayload, JwtRefreshPayload } from '@modules/auth/auth.types';
import { SafeUser, withoutPasswordHash } from '@common/utils/user.util';

// Decoy hash compared against when a login email has no matching user, so the
// response time does not reveal whether the account exists.
const DUMMY_PASSWORD_HASH = bcrypt.hashSync(
  'timing-attack-guard',
  BCRYPT_ROUNDS,
);

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
    private readonly eventEmitter: EventEmitter2,
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

  async login(
    email: string,
    password: string,
    tenantSlug?: string,
  ): Promise<TokenPair> {
    const candidates = await this.prisma.user.findMany({
      where: {
        email: email.toLowerCase(),
        active: true,
      },
      take: 2,
      include: { tenant: { select: { slug: true } } },
    });

    let user: (typeof candidates)[number] | undefined;

    if (candidates.length === 1) {
      user = candidates[0];
    } else if (candidates.length > 1 && tenantSlug) {
      // Multiple tenants share this email — require tenantSlug to disambiguate
      user = candidates.find((u) => u.tenant.slug === tenantSlug);
    }

    // Always run a bcrypt comparison to keep response time constant whether or
    // not the user exists — mitigates timing-based user enumeration.
    const passwordHash = user?.passwordHash ?? DUMMY_PASSWORD_HASH;
    const passwordValid = await bcrypt.compare(password, passwordHash);

    if (!user || !passwordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    return this.generateTokenPair(user);
  }

  /**
   * Auto-cadastro público de cliente: cria Customer (origin MANUAL) + User
   * (papel CLIENTE) vinculados, numa transação, e devolve um par de tokens.
   */
  async registerClient(dto: {
    name: string;
    phone: string;
    email?: string;
    password: string;
    tenantSlug: string;
  }): Promise<TokenPair> {
    const tenant = await this.prisma.tenant.findUnique({
      where: { slug: dto.tenantSlug },
      select: { id: true },
    });
    if (!tenant) {
      throw new NotFoundException('Barbearia não encontrada');
    }

    const email = dto.email?.toLowerCase();
    if (email) {
      const existing = await this.prisma.user.findFirst({
        where: { tenantId: tenant.id, email },
        select: { id: true },
      });
      if (existing) {
        throw new ConflictException('E-mail já cadastrado');
      }
    }

    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);
    // E-mail é opcional para clientes; quando ausente, geramos um placeholder
    // único por tenant para satisfazer a unicidade (login será por e-mail real).
    const loginEmail = email ?? `cliente_${randomUUID()}@no-email.local`;

    const user = await this.prisma.$transaction(async (tx) => {
      const customer = await tx.customer.create({
        data: {
          tenantId: tenant.id,
          name: dto.name,
          phone: dto.phone,
          origin: CustomerOrigin.MANUAL,
        },
      });
      return tx.user.create({
        data: {
          tenantId: tenant.id,
          name: dto.name,
          email: loginEmail,
          passwordHash,
          role: UserRole.CLIENTE,
          customerId: customer.id,
        },
      });
    });

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
    // Atomic get+delete: prevents refresh-token replay under concurrent requests.
    const exists = await this.redis.getdel(key);

    if (!exists) {
      throw new UnauthorizedException('Invalid refresh token');
    }

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

  /**
   * Inicia a recuperação de senha. Sempre retorna sem erro (resposta genérica)
   * para não revelar se o e-mail existe. Gera token de uso único em Redis e emite
   * evento para envio do e-mail (efeito colateral fora do handler).
   */
  async forgotPassword(email: string): Promise<void> {
    const user = await this.prisma.user.findFirst({
      where: { email: email.toLowerCase(), active: true },
      include: { tenant: { select: { slug: true } } },
    });

    if (!user) return; // resposta genérica

    const token = randomUUID();
    await this.redis.set(
      passwordResetKey(token),
      JSON.stringify({ tenantId: user.tenantId, userId: user.id }),
      'EX',
      PASSWORD_RESET_TTL_SECONDS,
    );

    this.eventEmitter.emit(SENHA_RECUPERACAO_SOLICITADA, {
      tenantId: user.tenantId,
      userId: user.id,
      email: user.email,
      tenantSlug: user.tenant.slug,
      token,
    });
  }

  /**
   * Redefine a senha a partir de um token válido (uso único, atômico via GETDEL).
   * Revoga todos os refresh tokens do usuário ao concluir.
   */
  async resetPassword(token: string, password: string): Promise<void> {
    const raw = await this.redis.getdel(passwordResetKey(token));
    if (!raw) {
      throw new UnauthorizedException('Token inválido ou expirado');
    }

    let payload: { tenantId: string; userId: string };
    try {
      payload = JSON.parse(raw);
    } catch {
      throw new UnauthorizedException('Token inválido ou expirado');
    }

    const user = await this.prisma.user.findFirst({
      where: { id: payload.userId, tenantId: payload.tenantId, active: true },
    });
    if (!user) {
      throw new UnauthorizedException('Token inválido ou expirado');
    }

    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
    await this.prisma.user.update({
      where: { id: user.id, tenantId: user.tenantId },
      data: { passwordHash },
    });

    await this.revokeAllRefreshTokens(user.tenantId, user.id);
  }

  /** Revoga todos os refresh tokens ativos de um usuário. */
  private async revokeAllRefreshTokens(
    tenantId: string,
    userId: string,
  ): Promise<void> {
    const pattern = refreshTokenPattern(tenantId, userId);
    const keys: string[] = [];
    let cursor = '0';
    do {
      const [next, batch] = await this.redis.scan(
        cursor,
        'MATCH',
        pattern,
        'COUNT',
        100,
      );
      cursor = next;
      keys.push(...batch);
    } while (cursor !== '0');

    if (keys.length > 0) {
      await this.redis.del(...keys);
    }
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
