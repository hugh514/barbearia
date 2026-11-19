import { Appointment, Customer, User } from '@prisma/client';
import { AppointmentResponseDto } from '@modules/appointments/dto/appointment-response.dto';

type AppointmentWithRelations = Appointment & {
  customer?: Pick<Customer, 'id' | 'name' | 'phone'>;
  barber?: Pick<User, 'id' | 'name'> | null;
};

export function toAppointmentResponse(
  appointment: AppointmentWithRelations,
  options?: { includeWaitTime?: boolean; includeDuration?: boolean },
): AppointmentResponseDto {
  const now = Date.now();
  const waitTimeSeconds =
    options?.includeWaitTime && appointment.status === 'AGUARDANDO'
      ? Math.floor((now - appointment.createdAt.getTime()) / 1000)
      : undefined;

  let durationSeconds: number | null | undefined;
  if (options?.includeDuration) {
    durationSeconds =
      appointment.startedAt && appointment.finishedAt
        ? Math.floor(
            (appointment.finishedAt.getTime() -
              appointment.startedAt.getTime()) /
              1000,
          )
        : null;
  }

  return {
    id: appointment.id,
    tenantId: appointment.tenantId,
    customerId: appointment.customerId,
    barberId: appointment.barberId,
    status: appointment.status,
    services: appointment.services,
    totalPrice: appointment.totalPrice?.toString() ?? null,
    notes: appointment.notes,
    cancelReason: appointment.cancelReason,
    startedAt: appointment.startedAt,
    finishedAt: appointment.finishedAt,
    createdAt: appointment.createdAt,
    enteredAt: appointment.createdAt,
    updatedAt: appointment.updatedAt,
    customer: appointment.customer
      ? {
          id: appointment.customer.id,
          name: appointment.customer.name,
          phone: appointment.customer.phone,
        }
      : undefined,
    barber: appointment.barber
      ? {
          id: appointment.barber.id,
          name: appointment.barber.name,
        }
      : appointment.barberId
        ? null
        : undefined,
    waitTimeSeconds,
    durationSeconds,
  };
}
