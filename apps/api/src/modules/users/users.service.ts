import {
  ConflictException,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Prisma, User, UserRole } from '@prisma/client';
import { PrismaService } from '@prisma/prisma.service';
import { SafeUser, withoutPasswordHash } from '@common/utils/user.util';
import { AuthService } from '@modules/auth/auth.service';
import { AuthenticatedUser } from '@modules/auth/auth.types';
import { CreateUserDto } from '@modules/users/dto/create-user.dto';
import { UpdateUserDto } from '@modules/users/dto/update-user.dto';

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly authService: AuthService,
  ) {}

  async create(
    creator: AuthenticatedUser,
    dto: CreateUserDto,
  ): Promise<SafeUser> {
    if (!this.authService.canCreateRole(creator.role, dto.role)) {
      throw new ForbiddenException(
        'Insufficient permissions to create this role',
      );
    }

    const existing = await this.prisma.user.findUnique({
      where: {
        tenantId_email: {
          tenantId: creator.tenantId,
          email: dto.email.toLowerCase(),
        },
      },
    });

    if (existing) {
      throw new ConflictException('Email already exists in this tenant');
    }

    const passwordHash = await this.authService.hashPassword(dto.password);

    const user = await this.prisma.user.create({
      data: {
        tenantId: creator.tenantId,
        name: dto.name,
        email: dto.email.toLowerCase(),
        passwordHash,
        role: dto.role,
        active: true,
      },
    });

    return withoutPasswordHash(user);
  }

  async findAll(
    tenantId: string,
    page: number,
    limit: number,
    scope?: 'staff',
  ): Promise<{ data: SafeUser[]; total: number; page: number; limit: number }> {
    const skip = (page - 1) * limit;
    const where: Prisma.UserWhereInput =
      scope === 'staff'
        ? { tenantId, role: { not: UserRole.CLIENTE } }
        : { tenantId };

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.user.count({ where }),
    ]);

    return {
      data: users.map(withoutPasswordHash),
      total,
      page,
      limit,
    };
  }

  async update(
    actor: AuthenticatedUser,
    targetUserId: string,
    dto: UpdateUserDto,
  ): Promise<SafeUser> {
    const target = await this.findUserInTenant(targetUserId, actor.tenantId);

    const isSelf = actor.userId === targetUserId;
    const isAdmin = actor.role === UserRole.ADMIN;

    if (!isAdmin && !isSelf) {
      throw new ForbiddenException('Insufficient permissions');
    }

    if (!isAdmin && dto.role !== undefined && dto.role !== target.role) {
      throw new ForbiddenException('Cannot change role');
    }

    if (isAdmin && dto.role !== undefined && actor.userId !== targetUserId) {
      if (!this.authService.canCreateRole(actor.role, dto.role)) {
        throw new ForbiddenException(
          'Insufficient permissions to assign this role',
        );
      }
    }

    if (dto.email && dto.email.toLowerCase() !== target.email) {
      const existing = await this.prisma.user.findUnique({
        where: {
          tenantId_email: {
            tenantId: actor.tenantId,
            email: dto.email.toLowerCase(),
          },
        },
      });

      if (existing && existing.id !== targetUserId) {
        throw new ConflictException('Email already exists in this tenant');
      }
    }

    const updateData: {
      name?: string;
      email?: string;
      passwordHash?: string;
      role?: UserRole;
    } = {};

    if (dto.name !== undefined) {
      updateData.name = dto.name;
    }
    if (dto.email !== undefined) {
      updateData.email = dto.email.toLowerCase();
    }
    if (dto.password !== undefined) {
      updateData.passwordHash = await this.authService.hashPassword(
        dto.password,
      );
    }
    if (dto.role !== undefined && isAdmin) {
      updateData.role = dto.role;
    }

    const updated = await this.prisma.user.update({
      where: { id: targetUserId },
      data: updateData,
    });

    return withoutPasswordHash(updated);
  }

  async deactivate(
    actor: AuthenticatedUser,
    targetUserId: string,
  ): Promise<SafeUser> {
    if (actor.role !== UserRole.ADMIN) {
      throw new ForbiddenException('Insufficient permissions');
    }

    await this.findUserInTenant(targetUserId, actor.tenantId);

    if (actor.userId === targetUserId) {
      throw new ForbiddenException('Cannot deactivate your own account');
    }

    const updated = await this.prisma.user.update({
      where: { id: targetUserId },
      data: { active: false },
    });

    return withoutPasswordHash(updated);
  }

  private async findUserInTenant(
    userId: string,
    tenantId: string,
  ): Promise<User> {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, tenantId },
    });

    if (!user) {
      throw new ForbiddenException('User not found in this tenant');
    }

    return user;
  }
}
