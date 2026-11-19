import { createZodDto } from '@anatine/zod-nestjs';
import { z } from 'zod';

export const channelServiceSchema = z.object({
  name: z.string().min(1),
  price: z.string().min(1),
});

export const brandColorSchema = z
  .string()
  .regex(/^#[0-9a-fA-F]{6}$/, 'brandColor deve ser #RRGGBB');

export const themeModeSchema = z.enum(['light', 'dark']);

export const createChannelConfigSchema = z.object({
  businessName: z.string().min(1),
  services: z.array(channelServiceSchema).default([]),
  address: z.string().min(1),
  phone: z.string().min(8),
  workingHours: z.string().min(1),
  rules: z.string().optional(),
  whatsappInstance: z.string().optional(),
  instagramPageId: z.string().optional(),
  brandColor: brandColorSchema.optional(),
  themeMode: themeModeSchema.optional(),
});

export class CreateChannelConfigDto extends createZodDto(
  createChannelConfigSchema,
) {}
