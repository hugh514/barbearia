import { ChannelConfig, Prisma } from '@prisma/client';
import { ChannelConfigResponseDto } from './dto/config-response.dto';

export interface ChannelServiceItem {
  name: string;
  price: string;
}

function isChannelServiceItem(value: unknown): value is ChannelServiceItem {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const record = value as Record<string, unknown>;
  return typeof record.name === 'string' && typeof record.price === 'string';
}

export function parseServices(
  services: Prisma.JsonValue,
): ChannelServiceItem[] {
  if (!Array.isArray(services)) {
    return [];
  }

  const parsed: ChannelServiceItem[] = [];
  for (const item of services) {
    if (isChannelServiceItem(item)) {
      parsed.push({ name: item.name, price: item.price });
    }
  }
  return parsed;
}

export function toChannelConfigResponse(
  config: ChannelConfig,
): ChannelConfigResponseDto {
  return {
    id: config.id,
    tenantId: config.tenantId,
    businessName: config.businessName,
    services: parseServices(config.services),
    address: config.address,
    phone: config.phone,
    workingHours: config.workingHours,
    rules: config.rules,
    whatsappInstance: config.whatsappInstance,
    instagramPageId: config.instagramPageId,
    brandColor: config.brandColor,
    themeMode: config.themeMode === 'dark' ? 'dark' : 'light',
    createdAt: config.createdAt.toISOString(),
    updatedAt: config.updatedAt.toISOString(),
  };
}
