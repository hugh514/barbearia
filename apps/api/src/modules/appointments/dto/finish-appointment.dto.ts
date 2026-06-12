import { createZodDto } from '@anatine/zod-nestjs';
import { z } from 'zod';

export const finishAppointmentSchema = z.object({
  notes: z.string().min(1).optional(),
  totalPrice: z.number().positive().optional(),
});

export class FinishAppointmentDto extends createZodDto(
  finishAppointmentSchema,
) {}
