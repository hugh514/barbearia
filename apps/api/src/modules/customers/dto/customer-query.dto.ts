import { createZodDto } from '@anatine/zod-nestjs';
import { z } from 'zod';
import { paginationQuerySchema } from '@common/pagination/pagination-query.schema';

export const customerQuerySchema = paginationQuerySchema.extend({
  search: z.string().min(1).optional(),
});

export class CustomerQueryDto extends createZodDto(customerQuerySchema) {}
