import { createZodDto } from '@anatine/zod-nestjs';
import { ConversationStatus } from '@prisma/client';
import { z } from 'zod';

export const updateStatusSchema = z.object({
  status: z.enum([
    ConversationStatus.AGUARDANDO,
    ConversationStatus.EM_ATENDIMENTO,
    ConversationStatus.FECHADA,
  ]),
  assignedTo: z.string().uuid().optional(),
});

export class UpdateStatusDto extends createZodDto(updateStatusSchema) {}
