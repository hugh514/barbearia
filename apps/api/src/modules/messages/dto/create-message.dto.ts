import { createZodDto } from '@anatine/zod-nestjs';
import { ConversationChannel, MessageDirection } from '@prisma/client';
import { z } from 'zod';

export const createMessageSchema = z.object({
  content: z.string().min(1),
  direction: z.nativeEnum(MessageDirection),
  channel: z.nativeEnum(ConversationChannel),
  externalId: z.string().min(1).optional(),
});

export class CreateMessageDto extends createZodDto(createMessageSchema) {}
