import { createZodDto } from '@anatine/zod-nestjs';
import { z } from 'zod';
import { channelServiceSchema } from './create-config.dto';

export const updateChannelConfigSchema = z.object({
  businessName: z.string().min(1).optional(),
  services: z.array(channelServiceSchema).optional(),
  address: z.string().min(1).optional(),
  phone: z.string().min(8).optional(),
  workingHours: z.string().min(1).optional(),
  rules: z.string().nullable().optional(),
  whatsappInstance: z.string().nullable().optional(),
  instagramPageId: z.string().nullable().optional(),
});

export class UpdateChannelConfigDto extends createZodDto(
  updateChannelConfigSchema,
) {}
