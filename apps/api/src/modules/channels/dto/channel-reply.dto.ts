import { createZodDto } from '@anatine/zod-nestjs';
import { z } from 'zod';

export const channelReplySchema = z.object({
  conversationId: z.string().uuid(),
  message: z.string().min(1),
});

export class ChannelReplyDto extends createZodDto(channelReplySchema) {}
