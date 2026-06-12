import { createZodDto } from '@anatine/zod-nestjs';
import { z } from 'zod';

export const channelServiceSchema = z.object({
  name: z.string().min(1),
  price: z.string().min(1),
});

export const createChannelConfigSchema = z.object({
  businessName: z.string().min(1),
  services: z.array(channelServiceSchema).default([]),
  address: z.string().min(1),
  phone: z.string().min(8),
  workingHours: z.string().min(1),
  rules: z.string().optional(),
  whatsappInstance: z.string().optional(),
  instagramPageId: z.string().optional(),
});

export class CreateChannelConfigDto extends createZodDto(
  createChannelConfigSchema,
) {}
