'use client';

import { useEffect, useState, type KeyboardEvent } from 'react';
import { Play, X } from 'lucide-react';
import type { Appointment } from './schemas';
import { useQueueActions } from './use-queue';
import { FinishDialog } from './finish-dialog';
import { groupQueue } from './group';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/dialog';
import { useToast } from '@/components/ui/toast';
import { formatBRL, formatTime } from '@/lib/format';
import { duration, waited } from '@/lib/relative-time';
import { cn } from '@/lib/utils';

type Tab = 'waiting' | 'chair' | 'done';
const TABS: { id: Tab; label: string }[] = [
  { id: 'waiting', label: 'Esperando' },
  { id: 'chair', label: 'Na cadeira' },
  { id: 'done', label: 'Feitos' },
];

/** Relógio que anda a cada 30 s, para "há 12 min" não parar no tempo. */
function useNow(ms = 30_000): Date {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), ms);
    return () => clearInterval(id);
  }, [ms]);
  return now;
}

const nameOf = (a: Appointment) => a.customer?.name ?? 'Cliente';

function WaitingRow({
  appt,
  position,
  now,
  onCancel,
}: {
  appt: Appointment;
  position: number;
  now: Date;
  onCancel: (a: Appointment) => void;
}) {
  const { start } = useQueueActions();
  const { toast } = useToast();
  const name = nameOf(appt);
  const entered = appt.enteredAt ?? appt.createdAt;
  const next = position === 1;
  const startNow = () =>
    start.mutate(appt.id, {
      onSuccess: () => toast('Atendimento iniciado.'),
      onError: (e) =>
        toast(e instanceof Error ? e.message : 'Não foi possível iniciar. Tente de novo.', 'error'),
    });

  return (
    <li className={cn('px-3 py-1.5', next && 'bg-accent pb-3')}>
      <div className="flex min-h-11 items-center gap-3">
        <span className="w-8 shrink-0 text-2xl leading-none font-extrabold tabular-nums font-stretch-extra-condensed text-foreground">
          <span aria-hidden>{String(position).padStart(2, '0')}</span>
          <span className="sr-only">{position}º da fila</span>
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-semibold text-foreground" title={name}>
            {name}
          </span>
          {appt.services.length > 0 && (
            <span className="block truncate text-sm text-muted-foreground">{appt.services.join(', ')}</span>
          )}
        </span>
        <span
          className="shrink-0 text-sm tabular-nums text-muted-foreground"
          title={`Chegou às ${formatTime(entered)}`}
        >
          {waited(entered, now)}
        </span>
        {!next && (
          <Button
            size="lg"
            variant="ghost"
            aria-label={`Iniciar atendimento de ${name}`}
            title="Iniciar atendimento"
            disabled={start.isPending}
            onClick={startNow}
            className="w-11 px-0 text-foreground"
          >
            <Play />
          </Button>
        )}
        <Button
          size="lg"
          variant="ghost"
          aria-label={`Cancelar atendimento de ${name}`}
          title="Cancelar atendimento"
          onClick={() => onCancel(appt)}
          className="w-11 px-0 text-muted-foreground"
        >
          <X />
        </Button>
      </div>
      {next && (
        <Button
          size="lg"
          className="mt-1 w-full"
          aria-label={`Iniciar atendimento de ${name}`}
          disabled={start.isPending}
          onClick={startNow}
        >
          Iniciar atendimento
        </Button>
      )}
    </li>
  );
}

function ChairCard({
  appt,
  now,
  onFinish,
}: {
  appt: Appointment;
  now: Date;
  onFinish: (a: Appointment) => void;
}) {
  const name = nameOf(appt);
  return (
    <li className="rounded-lg border border-primary bg-accent p-4">
      <p className="truncate font-semibold text-foreground" title={name}>
        {name}
      </p>
      <p className="text-sm text-muted-foreground">
        Na cadeira há{' '}
        <span className="tabular-nums">{appt.startedAt ? duration(appt.startedAt, now) : '0 min'}</span>
        {appt.barber?.name && (
          <>
            , com <span className="break-words">{appt.barber.name}</span>
          </>
        )}
      </p>
      {appt.services.length > 0 && (
        <p className="truncate text-sm text-muted-foreground">{appt.services.join(', ')}</p>
      )}
      <Button size="lg" variant="secondary" className="mt-3" onClick={() => onFinish(appt)}>
        Finalizar atendimento
      </Button>
    </li>
  );
}

function DoneRow({ appt }: { appt: Appointment }) {
  const name = nameOf(appt);
  const cancelled = appt.status === 'CANCELADO';
  const price = Number(appt.totalPrice);
  const when = cancelled ? appt.updatedAt : (appt.finishedAt ?? appt.updatedAt);

  return (
    <li className={cn('flex items-baseline gap-3 px-4 py-3', cancelled && 'text-muted-foreground')}>
      <span className="w-12 shrink-0 text-sm tabular-nums text-muted-foreground">{formatTime(when)}</span>
      <span className="min-w-0 flex-1">
        <span
          className={cn('block truncate text-sm', cancelled ? 'line-through' : 'font-medium text-foreground')}
          title={name}
        >
          {name}
        </span>
        <span className="block truncate text-sm text-muted-foreground">
          {cancelled
            ? 'Cancelado'
            : appt.services.length
              ? appt.services.join(', ')
              : 'Sem serviço registrado'}
        </span>
      </span>
      <span className="shrink-0 text-right text-sm tabular-nums text-foreground">
        {cancelled ? '' : price > 0 ? formatBRL(price) : 'sem valor'}
      </span>
    </li>
  );
}

const EMPTY: Record<Tab, string> = {
  waiting: 'Ninguém esperando. Quando alguém chegar, use Cliente chegou.',
  chair: 'Nenhuma cadeira ocupada. Comece pelo primeiro da fila.',
  done: 'Nenhum atendimento finalizado hoje.',
};

function Empty({ tab }: { tab: Tab }) {
  return (
    <p className="rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">
      {EMPTY[tab]}
    </p>
  );
}

export function QueueBoard({ appointments }: { appointments: Appointment[] }) {
  const { cancel } = useQueueActions();
  const { toast } = useToast();
  const now = useNow();
  const [tab, setTab] = useState<Tab>('waiting');
  const [finishing, setFinishing] = useState<Appointment | null>(null);
  const [cancelling, setCancelling] = useState<Appointment | null>(null);
  const g = groupQueue(appointments);
  const counts: Record<Tab, number> = {
    waiting: g.waiting.length,
    chair: g.chair.length,
    done: g.finishedCount,
  };

  // Abas só no celular (WAI-ARIA tabs): setas trocam de aba.
  function onTabKey(e: KeyboardEvent<HTMLButtonElement>) {
    const i = TABS.findIndex((t) => t.id === tab);
    const next =
      e.key === 'ArrowRight' ? (i + 1) % TABS.length : e.key === 'ArrowLeft' ? (i + TABS.length - 1) % TABS.length : -1;
    if (next < 0) return;
    e.preventDefault();
    setTab(TABS[next].id);
    document.getElementById(`tab-${TABS[next].id}`)?.focus();
  }

  const panel = (id: Tab) => ({
    id: `panel-${id}`,
    'aria-labelledby': `col-${id}`,
    className: cn('min-w-0 space-y-3', tab !== id && 'hidden lg:block'),
  });

  const heading = (id: Tab, label: string, extra?: React.ReactNode) => (
    <h2
      id={`col-${id}`}
      className="sr-only flex items-baseline gap-2 text-sm font-semibold text-foreground lg:not-sr-only lg:flex"
    >
      {label}
      <span className="font-normal tabular-nums text-muted-foreground">{counts[id]}</span>
      {extra}
    </h2>
  );

  return (
    <>
      <div
        role="tablist"
        aria-label="Colunas da fila"
        className="sticky top-14 z-10 -mx-4 mb-4 grid grid-cols-3 border-b border-border bg-background px-4 md:top-0 md:-mx-8 md:px-8 lg:hidden"
      >
        {TABS.map((t) => {
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              id={`tab-${t.id}`}
              role="tab"
              type="button"
              aria-selected={active}
              aria-controls={`panel-${t.id}`}
              tabIndex={active ? 0 : -1}
              onClick={() => setTab(t.id)}
              onKeyDown={onTabKey}
              className={cn(
                '-mb-px flex h-12 items-center justify-center gap-1.5 border-b-2 text-sm font-semibold focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring',
                active ? 'border-primary text-primary-text' : 'border-transparent text-muted-foreground',
              )}
            >
              {t.label}
              <span className="font-normal tabular-nums">{counts[t.id]}</span>
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.4fr_1fr_1fr]">
        <section {...panel('waiting')}>
          {heading('waiting', 'Esperando')}
          {g.waiting.length === 0 ? (
            <Empty tab="waiting" />
          ) : (
            <ol className="divide-y divide-border overflow-hidden rounded-lg border border-border bg-card">
              {g.waiting.map((a, i) => (
                <WaitingRow key={a.id} appt={a} position={i + 1} now={now} onCancel={setCancelling} />
              ))}
            </ol>
          )}
        </section>

        <section {...panel('chair')}>
          {heading('chair', 'Na cadeira')}
          {g.chair.length === 0 ? (
            <Empty tab="chair" />
          ) : (
            <ul className="space-y-3">
              {g.chair.map((a) => (
                <ChairCard key={a.id} appt={a} now={now} onFinish={setFinishing} />
              ))}
            </ul>
          )}
        </section>

        <section {...panel('done')}>
          {heading(
            'done',
            'Feitos',
            g.finishedCount > 0 && (
              <span className="ml-auto font-normal tabular-nums text-muted-foreground">
                {formatBRL(g.revenue)}
              </span>
            ),
          )}
          {g.finishedCount > 0 && (
            <p className="flex justify-between text-sm text-muted-foreground lg:hidden">
              <span>Total do dia</span>
              <span className="tabular-nums text-foreground">{formatBRL(g.revenue)}</span>
            </p>
          )}
          {g.done.length === 0 ? (
            <Empty tab="done" />
          ) : (
            <ul
              aria-label="Atendimentos feitos hoje"
              className="divide-y divide-border rounded-lg border border-border bg-card"
            >
              {g.done.map((a) => (
                <DoneRow key={a.id} appt={a} />
              ))}
            </ul>
          )}
        </section>
      </div>

      <FinishDialog
        key={finishing?.id ?? 'nenhum'}
        appointment={finishing}
        open={Boolean(finishing)}
        onClose={() => setFinishing(null)}
      />

      <ConfirmDialog
        open={Boolean(cancelling)}
        onClose={() => setCancelling(null)}
        onConfirm={() => {
          if (!cancelling) return;
          cancel.mutate(
            { id: cancelling.id },
            {
              onSuccess: () => {
                toast('Atendimento cancelado.');
                setCancelling(null);
              },
              onError: (e) => {
                toast(
                  e instanceof Error ? e.message : 'Não foi possível cancelar. Tente de novo.',
                  'error',
                );
                setCancelling(null);
              },
            },
          );
        }}
        title="Cancelar atendimento?"
        description={`${cancelling?.customer?.name ?? 'O cliente'} sai da fila e aparece como cancelado em Feitos.`}
        confirmLabel="Cancelar atendimento"
        cancelLabel="Manter na fila"
        tone="destructive"
        loading={cancel.isPending}
      />
    </>
  );
}
