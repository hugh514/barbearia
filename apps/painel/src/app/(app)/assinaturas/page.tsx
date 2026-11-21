import { parseStatusFilter } from '@/features/subscriptions/schemas';
import { SubscriptionsView } from '@/features/subscriptions/subscriptions-view';

export default async function AssinaturasPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; page?: string }>;
}) {
  const sp = await searchParams;
  const page = Number(sp.page);
  return (
    <SubscriptionsView
      status={parseStatusFilter(sp.status)}
      page={Number.isInteger(page) && page > 0 ? page : 1}
    />
  );
}
