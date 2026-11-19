'use client';

import { useState } from 'react';
import { Plus } from 'lucide-react';
import { PageHeader } from '@/components/layout/page-header';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { StatusBadge } from '@/components/ui/status-badge';
import { useUsers } from '@/features/users/use-users';
import { CreateUserDialog } from '@/features/users/create-user-dialog';
import { ROLE_LABEL } from '@/features/users/schemas';

export default function BarbeirosPage() {
  const { data, isLoading, isError } = useUsers();
  const [dialogOpen, setDialogOpen] = useState(false);

  return (
    <div>
      <PageHeader
        title="Equipe"
        description="Quem atende e quem administra. Cada pessoa entra com o próprio e-mail."
        actions={
          <Button onClick={() => setDialogOpen(true)}>
            <Plus className="size-4" />
            Novo membro
          </Button>
        }
      />

      {isError && (
        <p className="mb-4 text-sm text-destructive">Erro ao carregar equipe.</p>
      )}

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      ) : (
        <Card className="divide-y divide-border">
          {(data?.data ?? []).map((u) => (
            <div
              key={u.id}
              className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 px-5 py-3"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-foreground">
                  {u.name}
                </p>
                <p className="truncate text-xs text-muted-foreground">{u.email}</p>
              </div>
              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                {ROLE_LABEL[u.role]}
                {!u.active && <StatusBadge>Inativo</StatusBadge>}
              </div>
            </div>
          ))}
          {data && data.data.length === 0 && (
            <p className="p-5 text-sm text-muted-foreground">
              Ninguém na equipe ainda. Use Novo membro para cadastrar.
            </p>
          )}
        </Card>
      )}

      <CreateUserDialog open={dialogOpen} onClose={() => setDialogOpen(false)} />
    </div>
  );
}
