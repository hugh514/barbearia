import { z } from 'zod';

// occupancyRate fica de fora: a API divide atendimentos por horas abertas
// fixas (10 h/dia), sem horário real da barbearia nem capacidade de cadeiras.
export const dashboardSummarySchema = z.object({
  period: z.string(),
  totalAppointments: z.number(),
  previousTotalAppointments: z.number(),
  newCustomers: z.number(),
  revenue: z.number(),
  appointmentsByDay: z.array(
    z.object({ date: z.string(), count: z.number(), revenue: z.number() }),
  ),
});
export type DashboardSummary = z.infer<typeof dashboardSummarySchema>;

export const plansMetricsSchema = z.object({
  activeSubscribers: z.number(),
  mrrCents: z.number(),
});

export const conversationsMetricsSchema = z.object({
  openConversations: z.number(),
  waitingForHuman: z.number(),
});

export const barbersMetricsSchema = z.object({
  barbers: z.array(
    z.object({
      barberId: z.string(),
      barberName: z.string(),
      totalAppointments: z.number(),
      averageServiceTimeMinutes: z.number().nullable(),
      revenue: z.number(),
    }),
  ),
});
export type BarbersMetrics = z.infer<typeof barbersMetricsSchema>;
