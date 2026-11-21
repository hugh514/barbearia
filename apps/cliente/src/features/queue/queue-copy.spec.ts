import { describe, expect, it } from 'vitest';
import { queueCopy, type MyQueue } from './queue-copy';

const q = (over: Partial<MyQueue>): MyQueue => ({
  position: 2,
  ahead: 1,
  status: 'AGUARDANDO',
  enteredAt: 'x',
  ...over,
});

describe('queueCopy', () => {
  it('fora da fila devolve null', () => {
    expect(queueCopy(q({ position: null, ahead: null, status: null, enteredAt: null }))).toBeNull();
  });

  it('na cadeira quando position 0', () => {
    expect(queueCopy(q({ position: 0, ahead: 0, status: 'EM_ATENDIMENTO' }))).toEqual({
      kind: 'chair',
      title: 'Você está na cadeira',
      detail: 'Bom corte.',
      wait: null,
    });
  });

  it('position 1 é o próximo, sem número', () => {
    expect(queueCopy(q({ position: 1, ahead: 0 }))).toEqual({
      kind: 'next',
      title: 'Você é o próximo',
      detail: 'Fique por perto.',
      wait: null,
    });
  });

  it('do segundo em diante mostra a posição e quantos estão na frente', () => {
    expect(queueCopy(q({ position: 2, ahead: 1 }))).toEqual({
      kind: 'waiting',
      position: 2,
      title: 'Você é o 2º da fila',
      detail: '1 na sua frente',
      wait: null,
    });
    expect(queueCopy(q({ position: 3, ahead: 2 }))?.detail).toBe('2 na sua frente');
  });

  it('sem ahead, conta pela posição', () => {
    expect(queueCopy(q({ position: 4, ahead: null }))?.detail).toBe('3 na sua frente');
  });

  it('espera estimada só quando a API manda', () => {
    expect(queueCopy(q({ position: 3, ahead: 2, estimatedWaitMinutes: 20 }))?.wait).toBe('cerca de 20 min');
    expect(queueCopy(q({ position: 3, ahead: 2, estimatedWaitMinutes: 0 }))?.wait).toBeNull();
    expect(queueCopy(q({ position: 1, ahead: 0, estimatedWaitMinutes: 5 }))?.wait).toBe('cerca de 5 min');
  });
});
