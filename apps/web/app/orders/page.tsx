'use client';

import Link from 'next/link';
import { ordersApi } from '@/lib/api';
import { useAsync } from '@/lib/hooks';
import { AppShell } from '@/components/AppShell';
import { StatusPill } from '@/components/StatusPill';
import { Button, Card, Eyebrow, EmptyState, ErrorNote, Spinner } from '@/components/ui';
import { formatINR, formatDate } from '@/lib/format';

export default function CustomerOrdersPage() {
  const { data, loading, error } = useAsync(() => ordersApi.list('?pageSize=50'));

  return (
    <AppShell requireRole="CUSTOMER">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <Eyebrow>Your shipments</Eyebrow>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">My orders</h1>
        </div>
        <Link href="/orders/new"><Button>New order</Button></Link>
      </div>

      {loading && <Spinner />}
      {error && <ErrorNote>{error}</ErrorNote>}
      {data && data.data.length === 0 && (
        <EmptyState title="No orders yet" hint="Create your first shipment to see it here." />
      )}

      {data && data.data.length > 0 && (
        <Card className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-line text-left font-mono text-xs uppercase tracking-wide text-faint">
                <tr>
                  <th className="px-4 py-3">Order</th>
                  <th className="px-4 py-3">Route</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Charge</th>
                  <th className="px-4 py-3">Placed</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {data.data.map((o) => (
                  <tr key={o.id} className="border-b border-line last:border-0 hover:bg-overlay/60">
                    <td className="px-4 py-3 font-mono">{o.orderNumber}</td>
                    <td className="px-4 py-3 font-mono text-xs">{o.pickupZone?.code} → {o.dropZone?.code}</td>
                    <td className="px-4 py-3"><StatusPill status={o.currentStatus} /></td>
                    <td className="px-4 py-3 font-mono tabular-nums">{formatINR(o.totalPaise)}</td>
                    <td className="px-4 py-3 text-muted">{formatDate(o.createdAt)}</td>
                    <td className="px-4 py-3 text-right">
                      <Link href={`/orders/${o.id}`} className="text-stamp hover:underline">View</Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </AppShell>
  );
}
