import { StatusBadge, type BadgeTone } from '@/components/ui/status-badge';

const BADGE: Record<string, { tone: BadgeTone; text: string }> = {
  ATIVO: { tone: 'success', text: 'Ativo' },
  PENDENTE: { tone: 'warning', text: 'Aguardando pagamento' },
  SUSPENSO: { tone: 'danger', text: 'Pagamento atrasado' },
};

export function SubscriptionBadge({ status }: { status: string }) {
  const badge = BADGE[status];
  return badge ? <StatusBadge tone={badge.tone}>{badge.text}</StatusBadge> : null;
}
