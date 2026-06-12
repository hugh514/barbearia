import { createZodDto } from '@anatine/zod-nestjs';
import { z } from 'zod';

export const whatsAppSendSchema = z.object({
  phone: z.string().min(8),
  message: z.string().min(1),
  conversationId: z.string().uuid().optional(),
});

export class WhatsAppSendDto extends createZodDto(whatsAppSendSchema) {}
