import { createZodDto } from '@anatine/zod-nestjs';
import { z } from 'zod';

export const createAppointmentSchema = z.object({
  customerId: z.string().uuid(),
  // Opcional: o Cliente chegou do painel, como o check-in por QR, entra na
  // fila sem serviço; os serviços feitos são registrados ao finalizar.
  services: z.array(z.string().min(1).max(100)).max(20).default([]),
});

export class CreateAppointmentDto extends createZodDto(
  createAppointmentSchema,
) {}
