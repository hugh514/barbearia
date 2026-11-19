import { createZodDto } from '@anatine/zod-nestjs';
import { AppointmentStatus } from '@prisma/client';
import { z } from 'zod';
import { paginationQuerySchema } from '@common/pagination/pagination-query.schema';

export const appointmentQuerySchema = paginationQuerySchema.extend({
  barberId: z.string().uuid().optional(),
  customerId: z.string().uuid().optional(),
  status: z.nativeEnum(AppointmentStatus).optional(),
  dateFrom: z.coerce.date().optional(),
  dateTo: z.coerce.date().optional(),
});

export const queueQuerySchema = z.object({
  include: z.enum(['finished']).optional(),
});

export class QueueQueryDto extends createZodDto(queueQuerySchema) {}

export class AppointmentQueryDto extends createZodDto(appointmentQuerySchema) {}
