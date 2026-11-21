'use client';

import { useState } from 'react';
import { Dialog } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input, fieldClass } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/toast';
import { useUserActions } from './use-users';
import { ROLE_LABEL, type UpdateUserInput, type User } from './schemas';

const STAFF_ROLES = ['ADMIN', 'GERENTE', 'BARBEIRO'] as const;

export function EditUserDialog({
  user,
  canChangeRole,
  onClose,
}: {
  user: User;
  canChangeRole: boolean;
  onClose: () => void;
}) {
  const { update } = useUserActions();
  const { toast } = useToast();
  const [name, setName] = useState(user.name);
  const [role, setRole] = useState(user.role);
  const [nameError, setNameError] = useState<string | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setServerError(null);
    const trimmed = name.trim();
    if (!trimmed) {
      setNameError('Informe o nome');
      return;
    }
    setNameError(null);
    const changes: UpdateUserInput = {};
    if (trimmed !== user.name) changes.name = trimmed;
    if (canChangeRole && role !== user.role) changes.role = role;
    if (Object.keys(changes).length === 0) {
      onClose();
      return;
    }
    update.mutate(
      { id: user.id, input: changes },
      {
        onSuccess: () => {
          toast('Alterações salvas.');
          onClose();
        },
        onError: (err) =>
          setServerError(err instanceof Error ? err.message : 'Não foi possível salvar. Tente de novo.'),
      },
    );
  }

  return (
    <Dialog open onClose={onClose} title="Editar membro" description={user.email}>
      <form onSubmit={submit} className="space-y-4" noValidate>
        <div className="space-y-2">
          <Label htmlFor="membro-nome">Nome</Label>
          <Input
            id="membro-nome"
            autoComplete="off"
            value={name}
            invalid={!!nameError}
            onChange={(e) => setName(e.target.value)}
          />
          {nameError && <p className="text-sm text-destructive">{nameError}</p>}
        </div>
        <div className="space-y-2">
          <Label htmlFor="membro-papel">Papel</Label>
          <select
            id="membro-papel"
            className={fieldClass}
            value={role}
            disabled={!canChangeRole}
            aria-describedby={canChangeRole ? undefined : 'membro-papel-ajuda'}
            onChange={(e) => setRole(e.target.value as User['role'])}
          >
            {STAFF_ROLES.map((r) => (
              <option key={r} value={r}>
                {ROLE_LABEL[r]}
              </option>
            ))}
          </select>
          {!canChangeRole && (
            <p id="membro-papel-ajuda" className="text-sm text-muted-foreground">
              Só o administrador troca o papel de outra pessoa.
            </p>
          )}
        </div>
        {serverError && (
          <p role="alert" className="text-sm text-destructive">
            {serverError}
          </p>
        )}
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" disabled={update.isPending}>
            {update.isPending ? 'Salvando…' : 'Salvar alterações'}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
