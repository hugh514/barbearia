import { describe, it, expect } from 'vitest';
import { groupQueue } from './group';
import type { Appointment } from './schemas';

function appt(id: string, status: Appointment['status'], extra: Partial<Appointment> = {}): Appointment {
  return {
    id,
    tenantId: 't',
    customerId: 'c',
    status,
    services: [],
    createdAt: '2026-11-19T12:00:00.000Z',
    updatedAt: '2026-11-19T12:00:00.000Z',
    ...extra,
  };
}

describe('groupQueue', () => {
  const list = [
    appt('a', 'AGUARDANDO'),
    appt('f1', 'FINALIZADO', { finishedAt: '2026-11-19T13:00:00.000Z', totalPrice: '45' }),
    appt('x', 'CANCELADO', { updatedAt: '2026-11-19T14:00:00.000Z' }),
    appt('c', 'EM_ATENDIMENTO'),
    appt('b', 'AGUARDANDO'),
    appt('f2', 'FINALIZADO', { finishedAt: '2026-11-19T14:30:00.000Z', totalPrice: '30.5' }),
    appt('f3', 'FINALIZADO', { finishedAt: '2026-11-19T12:30:00.000Z', totalPrice: null }),
  ];

  it('mantém a ordem de chegada de quem espera', () => {
    expect(groupQueue(list).waiting.map((a) => a.id)).toEqual(['a', 'b']);
  });

  it('separa quem está na cadeira', () => {
    expect(groupQueue(list).chair.map((a) => a.id)).toEqual(['c']);
  });

  it('Feitos: finalizados do mais recente ao mais antigo e cancelados no fim', () => {
    expect(groupQueue(list).done.map((a) => a.id)).toEqual(['f2', 'f1', 'f3', 'x']);
  });

  it('conta os finalizados e soma o valor do dia, sem contar cancelado', () => {
    const g = groupQueue(list);
    expect(g.finishedCount).toBe(3);
    expect(g.revenue).toBeCloseTo(75.5);
  });

  it('lista vazia', () => {
    expect(groupQueue([])).toEqual({ waiting: [], chair: [], done: [], finishedCount: 0, revenue: 0 });
  });
});
