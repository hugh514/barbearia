export interface MyQueue {
  position: number | null;
  ahead: number | null;
  status: string | null;
  enteredAt: string | null;
  estimatedWaitMinutes?: number | null;
}

export type QueueCopy =
  | { kind: 'chair' | 'next'; title: string; detail: string; wait: string | null }
  | { kind: 'waiting'; position: number; title: string; detail: string; wait: string | null };

export function queueCopy(q: MyQueue): QueueCopy | null {
  if (q.position === null) return null;
  if (q.position === 0) return { kind: 'chair', title: 'Você está na cadeira', detail: 'Bom corte.', wait: null };

  const minutes = q.estimatedWaitMinutes;
  const wait = minutes && minutes > 0 ? `cerca de ${Math.round(minutes)} min` : null;
  if (q.position === 1) return { kind: 'next', title: 'Você é o próximo', detail: 'Fique por perto.', wait };

  // Curto para caber ao lado do número em 390px sem quebrar.
  const ahead = q.ahead ?? q.position - 1;
  return {
    kind: 'waiting',
    position: q.position,
    title: `Você é o ${q.position}º da fila`,
    detail: `${ahead} na sua frente`,
    wait,
  };
}
