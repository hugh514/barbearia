import { createZodDto } from '@anatine/zod-nestjs';
import { z } from 'zod';

export const createPlanSchema = z.object({
  name: z.string().min(1),
  description: z.string().min(1).optional(),
  priceCents: z.number().int().positive(),
  intervalDays: z.number().int().positive().default(30),
  benefits: z.array(z.string().min(1)).default([]),
  active: z.boolean().default(true),
});

export class CreatePlanDto extends createZodDto(createPlanSchema) {}
