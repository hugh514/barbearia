import type { CustomerSubscription, UpdateCustomerInput } from './schemas';

/** Assinatura que vale agora: a mais recente que não foi cancelada (a API manda da mais nova). */
export function currentSubscription(list: CustomerSubscription[]): CustomerSubscription | null {
  return list.find((s) => s.status !== 'CANCELADO') ?? null;
}

const digits = (v: string | null | undefined) => (v ?? '').replace(/\D/g, '');
const text = (v: string | null | undefined) => (v ?? '').trim();

/**
 * Campos do formulário que mudaram, para o PATCH parcial. Telefone compara
 * pelos dígitos. Instagram vazio não vai (a API não aceita apagar).
 */
export function changedFields(
  original: { name: string; phone: string; instagramUser?: string | null },
  values: { name: string; phone: string; instagramUser?: string | null },
): UpdateCustomerInput {
  const out: UpdateCustomerInput = {};
  if (text(values.name) !== text(original.name)) out.name = text(values.name);
  if (digits(values.phone) !== digits(original.phone)) out.phone = values.phone;
  if (text(values.instagramUser) && text(values.instagramUser) !== text(original.instagramUser)) {
    out.instagramUser = text(values.instagramUser);
  }
  return out;
}
