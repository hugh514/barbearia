import { Body, Controller, Post } from '@nestjs/common';
import { ApiBody, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { z } from 'zod';
import { ZodValidationPipe } from '@common/pipes/zod-validation.pipe';
import { createZodDto } from '@anatine/zod-nestjs';

const validateBodySchema = z.object({
  name: z.string().min(1),
});

class ValidateBodyDto extends createZodDto(validateBodySchema) {}

@ApiTags('tenants')
@Controller('tenants')
export class TenantsController {
  @Post('validate')
  @ApiOperation({ summary: 'Validação de payload (stub para Feature 001)' })
  @ApiBody({ type: ValidateBodyDto })
  @ApiResponse({ status: 200, description: 'Payload válido' })
  @ApiResponse({ status: 400, description: 'Payload inválido' })
  validate(
    @Body(new ZodValidationPipe(validateBodySchema)) body: ValidateBodyDto,
  ): { ok: boolean; name: string } {
    return { ok: true, name: body.name };
  }
}
