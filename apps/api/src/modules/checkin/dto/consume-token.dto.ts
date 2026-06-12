import { createZodDto } from '@anatine/zod-nestjs';
import { z } from 'zod';

export const consumeTokenSchema = z.object({
  token: z.string().min(1),
});

export class ConsumeTokenDto extends createZodDto(consumeTokenSchema) {}
