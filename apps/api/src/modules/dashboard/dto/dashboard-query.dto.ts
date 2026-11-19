import { createZodDto } from '@anatine/zod-nestjs';
import { z } from 'zod';
import { PERIOD_VALUES, Period } from '../helpers/period.enum';

export const dashboardQuerySchema = z.object({
  period: z.enum(PERIOD_VALUES),
});

export class DashboardQueryDto extends createZodDto(dashboardQuerySchema) {}

export const dashboardOptionalPeriodSchema = z.object({
  period: z.enum(PERIOD_VALUES).default(Period.MONTH),
});

export class DashboardOptionalPeriodQueryDto extends createZodDto(
  dashboardOptionalPeriodSchema,
) {}
