import { createZodDto } from '@anatine/zod-nestjs';
import { ConversationChannel } from '@prisma/client';
import { z } from 'zod';

export const createConversationSchema = z.object({
  customerId: z.string().uuid(),
  channel: z.nativeEnum(ConversationChannel),
});

export class CreateConversationDto extends createZodDto(
  createConversationSchema,
) {}
