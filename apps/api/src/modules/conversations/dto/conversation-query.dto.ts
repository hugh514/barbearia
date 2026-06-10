import { createZodDto } from '@anatine/zod-nestjs';
import { ConversationChannel, ConversationStatus } from '@prisma/client';
import { z } from 'zod';
import {
  DEFAULT_PAGE,
  DEFAULT_PER_PAGE,
  MAX_PER_PAGE,
} from '@common/pagination/pagination.util';

export const conversationQuerySchema = z.object({
  status: z.nativeEnum(ConversationStatus).optional(),
  channel: z.nativeEnum(ConversationChannel).optional(),
  assignedTo: z.string().uuid().optional(),
  page: z.coerce.number().int().min(1).default(DEFAULT_PAGE),
  perPage: z.coerce
    .number()
    .int()
    .min(1)
    .max(MAX_PER_PAGE)
    .default(DEFAULT_PER_PAGE),
});

export class ConversationQueryDto extends createZodDto(
  conversationQuerySchema,
) {}
