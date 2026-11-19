import { createZodDto } from '@anatine/zod-nestjs';
import { z } from 'zod';

export const finishAppointmentSchema = z.object({
  notes: z.string().min(1).optional(),
  totalPrice: z.number().positive().optional(),
  // Serviços realizados — registrados no fechamento do atendimento walk-in.
  services: z.array(z.string().min(1)).optional(),
});

export class FinishAppointmentDto extends createZodDto(
  finishAppointmentSchema,
) {}
