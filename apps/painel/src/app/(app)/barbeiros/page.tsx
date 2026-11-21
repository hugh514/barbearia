'use client';

import { useState } from 'react';
import { Plus } from 'lucide-react';
import { PageHeader } from '@/components/layout/page-header';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/dialog';
import { ErrorState } from '@/components/ui/error-state';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/components/ui/toast';
import { useSession } from '@/features/auth/session-context';
import { useUserActions, useUsers } from '@/features/users/use-users';
import { CreateUserDialog } from '@/features/users/create-user-dialog';
import { EditUserDialog } from '@/features/users/edit-user-dialog';
import { ROLE_LABEL, type User } from '@/features/users/schemas';
import { splitTeam, teamPermissions } from '@/features/users/team';
import { cn } from '@/lib/utils';

function TeamTable({
  members,
  caption,
  muted,
  actor,
  onEdit,
  onDeactivate,
}: {
  members: User[];
  caption: string;
  muted?: boolean;
  actor: { id: string; role: User['role'] } | null;
  onEdit: (u: User) => void;
  onDeactivate: (u: User) => void;
}) {
  return (
    <div className="overflow-hidden rounded-lg border border-border bg-card">
      <table className={cn('w-full table-fixed text-sm', muted && 'text-muted-foreground')}>
        <caption className="sr-only">{caption}</caption>
        <thead className="border-b border-border text-left text-muted-foreground">
          <tr>
            <th scope="col" className="px-4 py-3 font-semibold">Nome</th>
            <th scope="col" className="hidden w-40 px-4 py-3 font-semibold sm:table-cell">Papel</th>
            {!muted && (
              <th scope="col" className="w-28 px-4 py-3 text-right font-semibold sm:w-56">
                <span className="sr-only">Ações</span>
              </th>
            )}
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {members.map((u) => {
            const can = actor ? teamPermissions(actor, u) : null;
            const isSelf = actor?.id === u.id;
            return (
              <tr key={u.id}>
                <td className="px-4 py-3">
                  <span className={cn('block truncate font-medium', !muted && 'text-foreground')} title={u.name}>
                    {u.name}
                    {isSelf && <span className="font-normal text-muted-foreground"> (você)</span>}
                  </span>
                  <span className="block truncate text-muted-foreground sm:hidden">{ROLE_LABEL[u.role]}</span>
                  <span className="block truncate text-muted-foreground" title={u.email}>
                    {u.email}
                  </span>
                </td>
                <td className="hidden px-4 py-3 sm:table-cell">{ROLE_LABEL[u.role]}</td>
                {!muted && (
                  <td className="px-2 py-2 text-right">
                    <div className="flex flex-col items-end gap-1 sm:flex-row sm:justify-end">
                      {can?.canEdit && (
                        <Button variant="ghost" size="lg" className="px-3" onClick={() => onEdit(u)} aria-label={`Editar ${u.name}`}>
                          Editar
                        </Button>
                      )}
                      {can?.canDeactivate && (
                        <Button
                          variant="ghost"
                          size="lg"
                          className="px-3 text-destructive hover:bg-destructive-soft"
                          onClick={() => onDeactivate(u)}
                          aria-label={`Desativar ${u.name}`}
                        >
                          Desativar
                        </Button>
                      )}
                    </div>
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export default function BarbeirosPage() {
  const { data, isLoading, isError, refetch, isFetching } = useUsers();
  const { user } = useSession();
  const { deactivate } = useUserActions();
  const { toast } = useToast();
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<User | null>(null);
  const [removing, setRemoving] = useState<User | null>(null);
  const actor = user ? { id: user.id, role: user.role } : null;
  const team = splitTeam(data?.data ?? []);

  return (
    <div>
      <PageHeader
        title="Equipe"
        description="Quem atende e quem administra. Cada pessoa entra com o próprio e-mail."
        actions={
          <Button onClick={() => setCreating(true)}>
            <Plus />
            Novo membro
          </Button>
        }
      />

      {isError ? (
        <ErrorState
          message="Não foi possível carregar a equipe."
          action={
            <Button variant="secondary" size="sm" onClick={() => refetch()} disabled={isFetching}>
              Tentar de novo
            </Button>
          }
        />
      ) : isLoading ? (
        <div className="space-y-2" aria-busy="true">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-14 w-full" />
          ))}
        </div>
      ) : (
        <div className="space-y-8">
          <section aria-labelledby="equipe-ativos" className="space-y-3">
            <h2 id="equipe-ativos" className="text-sm font-semibold text-foreground">
              Ativos <span className="font-normal tabular-nums text-muted-foreground">{team.active.length}</span>
            </h2>
            {team.active.length === 0 ? (
              <p className="rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">
                Ninguém na equipe ainda. Use Novo membro para cadastrar.
              </p>
            ) : (
              <TeamTable
                members={team.active}
                caption="Membros ativos"
                actor={actor}
                onEdit={setEditing}
                onDeactivate={setRemoving}
              />
            )}
          </section>

          {team.inactive.length > 0 && (
            <section aria-labelledby="equipe-desativados" className="space-y-3">
              <h2 id="equipe-desativados" className="text-sm font-semibold text-foreground">
                Desativados{' '}
                <span className="font-normal tabular-nums text-muted-foreground">{team.inactive.length}</span>
              </h2>
              <p className="text-sm text-muted-foreground">Não entram mais no painel. O histórico de atendimentos fica.</p>
              <TeamTable
                members={team.inactive}
                caption="Membros desativados"
                muted
                actor={actor}
                onEdit={setEditing}
                onDeactivate={setRemoving}
              />
            </section>
          )}
        </div>
      )}

      <CreateUserDialog open={creating} onClose={() => setCreating(false)} />

      {editing && actor && (
        <EditUserDialog
          key={editing.id}
          user={editing}
          canChangeRole={teamPermissions(actor, editing).canChangeRole}
          onClose={() => setEditing(null)}
        />
      )}

      <ConfirmDialog
        open={Boolean(removing)}
        onClose={() => setRemoving(null)}
        onConfirm={() => {
          if (!removing) return;
          deactivate.mutate(removing.id, {
            onSuccess: () => {
              toast(`${removing.name} foi desativado.`);
              setRemoving(null);
            },
            onError: (e) => {
              toast(e instanceof Error ? e.message : 'Não foi possível desativar. Tente de novo.', 'error');
              setRemoving(null);
            },
          });
        }}
        title={`Desativar ${removing?.name ?? 'membro'}?`}
        description="A pessoa não entra mais no painel. Os atendimentos dela continuam no histórico."
        confirmLabel="Desativar membro"
        cancelLabel="Manter ativo"
        tone="destructive"
        loading={deactivate.isPending}
      />
    </div>
  );
}
