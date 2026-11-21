import type { Appointment } from './schemas';

interface QueueGroups {
  waiting: Appointment[];
  chair: Appointment[];
  /** Finalizados do mais recente ao mais antigo, cancelados no fim. */
  done: Appointment[];
  finishedCount: number;
  /** Soma do valor cobrado nos finalizados do dia, em reais. */
  revenue: number;
}

const time = (v?: string | null) => (v ? new Date(v).getTime() : 0);

export function groupQueue(list: Appointment[]): QueueGroups {
  const by = (s: Appointment['status']) => list.filter((a) => a.status === s);
  const finished = by('FINALIZADO').sort((a, b) => time(b.finishedAt) - time(a.finishedAt));
  const cancelled = by('CANCELADO').sort((a, b) => time(b.updatedAt) - time(a.updatedAt));

  return {
    waiting: by('AGUARDANDO'),
    chair: by('EM_ATENDIMENTO'),
    done: [...finished, ...cancelled],
    finishedCount: finished.length,
    revenue: finished.reduce((sum, a) => sum + (Number(a.totalPrice) || 0), 0),
  };
}
