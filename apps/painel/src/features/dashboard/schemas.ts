import { z } from 'zod';

export const dashboardSummarySchema = z.object({
  period: z.string(),
  totalAppointments: z.number(),
  appointmentsByBarber: z.array(
    z.object({
      barberId: z.string().nullable(),
      barberName: z.string(),
      count: z.number(),
    }),
  ),
  newCustomers: z.number(),
  revenue: z.number(),
  occupancyRate: z.number(),
});
export type DashboardSummary = z.infer<typeof dashboardSummarySchema>;

export const PERIODS = ['today', 'week', 'month', 'year'] as const;
export type Period = (typeof PERIODS)[number];

/** Complemento de frase: "Números deste mês". */
export const PERIOD_PHRASE: Record<Period, string> = {
  today: 'de hoje',
  week: 'desta semana',
  month: 'deste mês',
  year: 'deste ano',
};
