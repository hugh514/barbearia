'use client';

import { useState } from 'react';
import { X } from 'lucide-react';
import type { Appointment, AppointmentStatus } from './schemas';
import { useQueueActions } from './use-queue';
import { FinishDialog } from './finish-dialog';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/dialog';
import { useToast } from '@/components/ui/toast';
import { formatTime } from '@/lib/format';
import { cn } from '@/lib/utils';

type Column = 'AGUARDANDO' | 'EM_ATENDIMENTO' | 'FINALIZADO';

const COLUMN_LABEL: Record<Column, string> = {
  AGUARDANDO: 'Esperando',
  EM_ATENDIMENTO: 'Na cadeira',
  FINALIZADO: 'Feitos',
};

const EMPTY: Record<Column, string> = {
  AGUARDANDO: 'Ninguém esperando. Quem chegar entra aqui pelo check-in.',
  EM_ATENDIMENTO: 'Nenhuma cadeira ocupada.',
  FINALIZADO: 'Nenhum atendimento finalizado hoje.',
};

function details(appt: Appointment): string {
  const parts = [
    appt.barber?.name,
    appt.services.length ? appt.services.join(', ') : null,
  ].filter(Boolean);
  return parts.join(', ');
}

function QueueCard({
  appt,
  position,
  onFinish,
  onCancel,
}: {
  appt: Appointment;
  position?: number;
  onFinish: (a: Appointment) => void;
  onCancel: (a: Appointment) => void;
}) {
  const { start } = useQueueActions();
  const { toast } = useToast();
  const name = appt.customer?.name ?? 'Cliente';
  const status = appt.status as AppointmentStatus;
  const done = status === 'FINALIZADO' || status === 'CANCELADO';
  const info = details(appt);

  return (
    <Card
      className={cn(
        'flex items-start gap-4 p-4',
        status === 'EM_ATENDIMENTO' && 'border-primary bg-accent',
        done && 'bg-transparent',
      )}
    >
      {position !== undefined && (
        <span className="w-10 shrink-0 text-4xl leading-none font-extrabold tabular-nums font-stretch-extra-condensed text-foreground">
          <span aria-hidden>{String(position).padStart(2, '0')}</span>
          <span className="sr-only">{position}º da fila</span>
        </span>
      )}
      <div className="min-w-0 flex-1">
        <p
          className={cn(
            'truncate text-sm font-semibold',
            done ? 'text-muted-foreground' : 'text-foreground',
          )}
        >
          {name}
        </p>
        <p className="truncate text-xs text-muted-foreground">
          {info ? `${info}. ` : ''}Chegou às{' '}
          <span className="tabular-nums">{formatTime(appt.createdAt)}</span>
        </p>
        {status === 'CANCELADO' && (
          <p className="mt-1 text-xs font-semibold text-destructive">Cancelado</p>
        )}

        {status === 'AGUARDANDO' && (
          <div className="mt-3 flex items-center gap-2">
            <Button
              size="lg"
              variant={position === 1 ? 'primary' : 'secondary'}
              disabled={start.isPending}
              onClick={() =>
                start.mutate(appt.id, {
                  onSuccess: () => toast('Atendimento iniciado.'),
                  onError: (e) =>
                    toast(
                      e instanceof Error ? e.message : 'Não foi possível iniciar. Tente de novo.',
                      'error',
                    ),
                })
              }
            >
              Iniciar atendimento
            </Button>
            <Button
              size="lg"
              variant="ghost"
              aria-label={`Cancelar atendimento de ${name}`}
              onClick={() => onCancel(appt)}
              className="px-3 text-muted-foreground"
            >
              <X />
            </Button>
          </div>
        )}
        {status === 'EM_ATENDIMENTO' && (
          <Button size="lg" variant="secondary" className="mt-3" onClick={() => onFinish(appt)}>
            Finalizar atendimento
          </Button>
        )}
      </div>
    </Card>
  );
}

export function QueueBoard({ appointments }: { appointments: Appointment[] }) {
  const { cancel } = useQueueActions();
  const { toast } = useToast();
  const [finishing, setFinishing] = useState<Appointment | null>(null);
  const [cancelling, setCancelling] = useState<Appointment | null>(null);

  const groups: { status: Column; items: Appointment[] }[] = [
    { status: 'AGUARDANDO', items: appointments.filter((a) => a.status === 'AGUARDANDO') },
    { status: 'EM_ATENDIMENTO', items: appointments.filter((a) => a.status === 'EM_ATENDIMENTO') },
    { status: 'FINALIZADO', items: appointments.filter((a) => a.status === 'FINALIZADO') },
  ];

  return (
    <>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {groups.map((g) => (
          <section key={g.status} aria-labelledby={`col-${g.status}`} className="space-y-3">
            <h2
              id={`col-${g.status}`}
              className="flex items-baseline gap-2 text-sm font-semibold text-foreground"
            >
              {COLUMN_LABEL[g.status]}
              <span className="font-normal tabular-nums text-muted-foreground">
                {g.items.length}
              </span>
            </h2>
            {g.items.length === 0 ? (
              <p className="rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">
                {EMPTY[g.status]}
              </p>
            ) : (
              g.items.map((a, i) => (
                <QueueCard
                  key={a.id}
                  appt={a}
                  position={g.status === 'AGUARDANDO' ? i + 1 : undefined}
                  onFinish={setFinishing}
                  onCancel={setCancelling}
                />
              ))
            )}
          </section>
        ))}
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
        description={`${cancelling?.customer?.name ?? 'O cliente'} sai da fila.`}
        confirmLabel="Cancelar atendimento"
        tone="destructive"
        loading={cancel.isPending}
      />
    </>
  );
}
