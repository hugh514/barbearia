import { createZodDto } from '@anatine/zod-nestjs';
import { z } from 'zod';

export const cancelAppointmentSchema = z.object({
  reason: z.string().min(1).optional(),
});

export class CancelAppointmentDto extends createZodDto(
  cancelAppointmentSchema,
) {}
