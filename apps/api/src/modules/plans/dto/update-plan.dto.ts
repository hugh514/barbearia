import { createZodDto } from '@anatine/zod-nestjs';
import { z } from 'zod';

export const updatePlanSchema = z
  .object({
    name: z.string().min(1).optional(),
    description: z.string().min(1).nullable().optional(),
    priceCents: z.number().int().positive().optional(),
    intervalDays: z.number().int().positive().optional(),
    benefits: z.array(z.string().min(1)).optional(),
    active: z.boolean().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field must be provided',
  });

export class UpdatePlanDto extends createZodDto(updatePlanSchema) {}
