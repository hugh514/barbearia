'use client';

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/toast';
import { ApiRequestError } from '@/lib/http/client';
import { maskPhone } from '@/lib/masks';
import { updateCustomer } from './services';
import { createCustomerSchema, type Customer } from './schemas';
import { changedFields } from './detail-logic';

type Errors = { name?: string; phone?: string };

export function CustomerEditForm({ customer }: { customer: Customer }) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [name, setName] = useState(customer.name);
  const [phone, setPhone] = useState(maskPhone(customer.phone));
  const [instagram, setInstagram] = useState(customer.instagramUser ?? '');
  const [errors, setErrors] = useState<Errors>({});
  const [serverError, setServerError] = useState<string | null>(null);

  const changes = changedFields(customer, { name, phone, instagramUser: instagram });
  const dirty = Object.keys(changes).length > 0;

  const save = useMutation({
    mutationFn: () => updateCustomer(customer.id, changes),
    onSuccess: (updated) => {
      queryClient.setQueryData(['customer', customer.id], updated);
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      toast('Dados do cliente salvos.');
    },
    onError: (e) =>
      setServerError(
        e instanceof ApiRequestError && e.status === 409
          ? 'Esse telefone já é de outro cliente.'
          : e instanceof Error
            ? e.message
            : 'Não foi possível salvar. Tente de novo.',
      ),
  });

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setServerError(null);
    const parsed = createCustomerSchema.safeParse({ name, phone, instagramUser: instagram });
    if (!parsed.success) {
      const next: Errors = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path[0] as keyof Errors;
        if (key === 'name' || key === 'phone') next[key] ??= issue.message;
      }
      setErrors(next);
      return;
    }
    setErrors({});
    save.mutate();
  }

  return (
    <form onSubmit={submit} className="space-y-4" noValidate>
      <div className="space-y-2">
        <Label htmlFor="cliente-nome">Nome</Label>
        <Input
          id="cliente-nome"
          autoComplete="off"
          value={name}
          invalid={!!errors.name}
          onChange={(e) => setName(e.target.value)}
        />
        {errors.name && <p className="text-sm text-destructive">{errors.name}</p>}
      </div>
      <div className="space-y-2">
        <Label htmlFor="cliente-telefone">Telefone</Label>
        <Input
          id="cliente-telefone"
          type="tel"
          inputMode="tel"
          autoComplete="off"
          value={phone}
          invalid={!!errors.phone}
          onChange={(e) => setPhone(maskPhone(e.target.value))}
        />
        {errors.phone && <p className="text-sm text-destructive">{errors.phone}</p>}
      </div>
      <div className="space-y-2">
        <Label htmlFor="cliente-instagram">Instagram (opcional)</Label>
        <Input
          id="cliente-instagram"
          autoComplete="off"
          spellCheck={false}
          value={instagram}
          onChange={(e) => setInstagram(e.target.value)}
        />
      </div>
      {serverError && (
        <p role="alert" className="text-sm text-destructive">
          {serverError}
        </p>
      )}
      <Button type="submit" size="lg" disabled={!dirty || save.isPending}>
        {save.isPending ? 'Salvando…' : 'Salvar dados'}
      </Button>
    </form>
  );
}
