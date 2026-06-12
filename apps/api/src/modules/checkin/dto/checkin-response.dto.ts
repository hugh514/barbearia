import { ApiProperty } from '@nestjs/swagger';
import { AppointmentResponseDto } from '@modules/appointments/dto/appointment-response.dto';

export class CheckinResponseDto {
  @ApiProperty({ type: AppointmentResponseDto })
  appointment!: AppointmentResponseDto;

  @ApiProperty({ description: 'Posição na fila do dia (1-based)' })
  queuePosition!: number;

  @ApiProperty({
    description: 'true se reutilizou atendimento aberto existente',
  })
  reused!: boolean;
}
