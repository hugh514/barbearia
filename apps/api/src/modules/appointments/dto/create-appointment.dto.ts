import { createZodDto } from '@anatine/zod-nestjs';
import { z } from 'zod';

export const createAppointmentSchema = z.object({
  customerId: z.string().uuid(),
  services: z.array(z.string().min(1)).min(1),
});

export class CreateAppointmentDto extends createZodDto(createAppointmentSchema) {}
