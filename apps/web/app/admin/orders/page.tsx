'use client';

import { Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { ordersApi, adminApi, type OrderStatus } from '@/lib/api';
import { useAsync } from '@/lib/hooks';
import { AppShell } from '@/components/AppShell';
import { StatusPill } from '@/components/StatusPill';
import { Card, Eyebrow, EmptyState, ErrorNote, Spinner } from '@/components/ui';
import { formatINR, formatDate } from '@/lib/format';

const STATUSES: OrderStatus[] = ['CREATED', 'ASSIGNED', 'PICKED_UP', 'IN_TRANSIT', 'OUT_FOR_DELIVERY', 'DELIVERED', 'FAILED', 'RESCHEDULED', 'CANCELLED'];

function OrdersTable() {
  const router = useRouter();
  const params = useSearchParams();
  const status = params.get('status') ?? '';
  const zoneId = params.get('zoneId') ?? '';
  const q = params.get('q') ?? '';

  const zones = useAsync(() => adminApi.zones());
  const query = new URLSearchParams();
  if (status) query.set('status', status);
  if (zoneId) query.set('zoneId', zoneId);
  if (q) query.set('q', q);
  query.set('pageSize', '100');
  const orders = useAsync(() => ordersApi.list(`?${query.toString()}`), [status, zoneId, q]);

  function setFilter(key: string, value: string) {
    const next = new URLSearchParams(params.toString());
    if (value) next.set(key, value); else next.delete(key);
    router.push(`/admin/orders?${next.toString()}`);
  }

  return (
    <>
      <div className="mb-5 flex items-center justify-between">
        <div>
          <Eyebrow>All shipments</Eyebrow>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">Orders</h1>
        </div>
      </div>

      <Card className="mb-5">
        <div className="flex flex-wrap items-end gap-3">
          <label className="text-sm">
            <span className="block text-xs text-ink/50">Status</span>
            <select value={status} onChange={(e) => setFilter('status', e.target.value)} className="mt-1 rounded border border-rule bg-white px-3 py-2 font-mono text-xs">
              <option value="">All</option>
              {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </label>
          <label className="text-sm">
            <span className="block text-xs text-ink/50">Zone</span>
            <select value={zoneId} onChange={(e) => setFilter('zoneId', e.target.value)} className="mt-1 rounded border border-rule bg-white px-3 py-2 font-mono text-xs">
              <option value="">All</option>
              {zones.data?.map((z) => <option key={z.id} value={z.id}>{z.code}</option>)}
            </select>
          </label>
          <label className="text-sm">
            <span className="block text-xs text-ink/50">Search order #</span>
            <input defaultValue={q} onKeyDown={(e) => e.key === 'Enter' && setFilter('q', (e.target as HTMLInputElement).value)} placeholder="LMD-…" className="mt-1 rounded border border-rule bg-white px-3 py-2 font-mono text-xs" />
          </label>
          {(status || zoneId || q) && (
            <button onClick={() => router.push('/admin/orders')} className="rounded border border-rule px-3 py-2 text-xs hover:border-ink">Clear</button>
          )}
        </div>
      </Card>

      {orders.loading && <Spinner />}
      {orders.error && <ErrorNote>{orders.error}</ErrorNote>}
      {orders.data && orders.data.data.length === 0 && <EmptyState title="No orders match these filters" hint="Adjust or clear the filters above." />}
      {orders.data && orders.data.data.length > 0 && (
        <Card className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-rule text-left font-mono text-xs uppercase tracking-wide text-ink/50">
                <tr>
                  <th className="px-4 py-3">Order</th><th className="px-4 py-3">Customer</th><th className="px-4 py-3">Route</th>
                  <th className="px-4 py-3">Status</th><th className="px-4 py-3">Agent</th><th className="px-4 py-3">Charge</th><th className="px-4 py-3">Placed</th><th />
                </tr>
              </thead>
              <tbody>
                {orders.data.data.map((o) => (
                  <tr key={o.id} className="border-b border-rule last:border-0 hover:bg-paper">
                    <td className="px-4 py-3 font-mono">{o.orderNumber}</td>
                    <td className="px-4 py-3">{o.customer?.fullName ?? '—'}</td>
                    <td className="px-4 py-3 font-mono text-xs">{o.pickupZone?.code} → {o.dropZone?.code}</td>
                    <td className="px-4 py-3"><StatusPill status={o.currentStatus} /></td>
                    <td className="px-4 py-3 text-xs">{o.assignedAgent?.user.fullName ?? '—'}</td>
                    <td className="px-4 py-3 font-mono tabular-nums">{formatINR(o.totalPaise)}</td>
                    <td className="px-4 py-3 text-ink/60">{formatDate(o.createdAt)}</td>
                    <td className="px-4 py-3 text-right"><Link href={`/admin/orders/${o.id}`} className="text-stamp hover:underline">Manage</Link></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </>
  );
}

export default function AdminOrdersPage() {
  return (
    <AppShell requireRole="ADMIN">
      <Suspense fallback={<Spinner />}>
        <OrdersTable />
      </Suspense>
    </AppShell>
  );
}
