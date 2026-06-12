import { Injectable, NotFoundException } from '@nestjs/common';
import { ChannelConfig, Prisma } from '@prisma/client';
import { PrismaService } from '@prisma/prisma.service';
import { toChannelConfigResponse } from './channel-config.mapper';
import { CreateChannelConfigDto } from './dto/create-config.dto';
import { ChannelConfigResponseDto } from './dto/config-response.dto';
import { UpdateChannelConfigDto } from './dto/update-config.dto';

@Injectable()
export class ChannelConfigService {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    tenantId: string,
    dto: CreateChannelConfigDto,
  ): Promise<ChannelConfigResponseDto> {
    const existing = await this.prisma.channelConfig.findUnique({
      where: { tenantId },
    });

    if (existing) {
      const updated = await this.prisma.channelConfig.update({
        where: { tenantId },
        data: this.toCreateData(dto),
      });
      return toChannelConfigResponse(updated);
    }

    const config = await this.prisma.channelConfig.create({
      data: {
        tenantId,
        ...this.toCreateData(dto),
      },
    });

    return toChannelConfigResponse(config);
  }

  async findOne(tenantId: string): Promise<ChannelConfigResponseDto> {
    const config = await this.findConfigInTenant(tenantId);
    return toChannelConfigResponse(config);
  }

  async update(
    tenantId: string,
    dto: UpdateChannelConfigDto,
  ): Promise<ChannelConfigResponseDto> {
    await this.findConfigInTenant(tenantId);

    const data: Prisma.ChannelConfigUpdateInput = {};

    if (dto.businessName !== undefined) {
      data.businessName = dto.businessName;
    }
    if (dto.services !== undefined) {
      data.services = dto.services;
    }
    if (dto.address !== undefined) {
      data.address = dto.address;
    }
    if (dto.phone !== undefined) {
      data.phone = dto.phone;
    }
    if (dto.workingHours !== undefined) {
      data.workingHours = dto.workingHours;
    }
    if (dto.rules !== undefined) {
      data.rules = dto.rules;
    }
    if (dto.whatsappInstance !== undefined) {
      data.whatsappInstance = dto.whatsappInstance;
    }
    if (dto.instagramPageId !== undefined) {
      data.instagramPageId = dto.instagramPageId;
    }

    const config = await this.prisma.channelConfig.update({
      where: { tenantId },
      data,
    });

    return toChannelConfigResponse(config);
  }

  async findByWhatsappInstance(
    instanceId: string,
  ): Promise<ChannelConfig | null> {
    return this.prisma.channelConfig.findFirst({
      where: { whatsappInstance: instanceId },
    });
  }

  async findByInstagramPageId(pageId: string): Promise<ChannelConfig | null> {
    return this.prisma.channelConfig.findFirst({
      where: { instagramPageId: pageId },
    });
  }

  async findConfigEntity(tenantId: string): Promise<ChannelConfig | null> {
    return this.prisma.channelConfig.findUnique({ where: { tenantId } });
  }

  private async findConfigInTenant(tenantId: string): Promise<ChannelConfig> {
    const config = await this.prisma.channelConfig.findUnique({
      where: { tenantId },
    });

    if (!config) {
      throw new NotFoundException('Channel config not found');
    }

    return config;
  }

  private toCreateData(
    dto: CreateChannelConfigDto,
  ): Omit<Prisma.ChannelConfigCreateInput, 'tenant'> {
    return {
      businessName: dto.businessName,
      services: dto.services,
      address: dto.address,
      phone: dto.phone,
      workingHours: dto.workingHours,
      rules: dto.rules,
      whatsappInstance: dto.whatsappInstance,
      instagramPageId: dto.instagramPageId,
    };
  }
}
