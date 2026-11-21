import { parsePeriod, periodStart, type PanelPeriod } from '@/features/dashboard/period';
import {
  paymentMethodSchema,
  paymentStatusSchema,
  type PaymentMethod,
  type PaymentStatus,
} from './schemas';

export interface PaymentFilters {
  period: PanelPeriod;
  status: PaymentStatus | undefined;
  method: PaymentMethod | undefined;
  page: number;
}

type Search = Record<string, string | string[] | undefined>;

/** Filtros vindos da URL: só valores conhecidos passam adiante. */
export function parsePaymentFilters(sp: Search): PaymentFilters {
  const status = paymentStatusSchema.safeParse(sp.status);
  const method = paymentMethodSchema.safeParse(sp.method);
  const page = Number(sp.page);
  return {
    period: parsePeriod(sp.period),
    status: status.success ? status.data : undefined,
    method: method.success ? method.data : undefined,
    page: Number.isInteger(page) && page > 0 ? page : 1,
  };
}

export function paymentsQuery(f: PaymentFilters, now = new Date()): string {
  const q = new URLSearchParams({ dateFrom: periodStart(f.period, now).toISOString() });
  if (f.status) q.set('status', f.status);
  if (f.method) q.set('method', f.method);
  q.set('page', String(f.page));
  return q.toString();
}
