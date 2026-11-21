import type { Metadata } from 'next';
import { CustomerDetail } from '@/features/customers/customer-detail';

export const metadata: Metadata = { title: 'Cliente' };

export default async function ClientePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <CustomerDetail id={id} />;
}
