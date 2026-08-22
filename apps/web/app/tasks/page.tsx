'use client';

import { useState } from 'react';
import { agentApi, ordersApi, ApiError, type OrderStatus } from '@/lib/api';
import { useAsync } from '@/lib/hooks';
import { AppShell } from '@/components/AppShell';
import { StatusPill } from '@/components/StatusPill';
import { Button, Card, Eyebrow, EmptyState, ErrorNote, Spinner } from '@/components/ui';

const NEXT: Partial<Record<OrderStatus, OrderStatus>> = {
  ASSIGNED: 'PICKED_UP',
  PICKED_UP: 'IN_TRANSIT',
  IN_TRANSIT: 'OUT_FOR_DELIVERY',
  OUT_FOR_DELIVERY: 'DELIVERED',
};

interface Task {
  id: string;
  orderNumber: string;
  currentStatus: OrderStatus;
  pickupZone: { code: string };
  dropZone: { code: string };
  pickupAddress: { line1: string; city: string; pincode: string; contactName: string; contactPhone: string };
  dropAddress: { line1: string; city: string; pincode: string; contactName: string; contactPhone: string };
}

export default function TasksPage() {
  const { data, loading, error, reload } = useAsync(() => agentApi.myOrders() as unknown as Promise<Task[]>);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [availability, setAvailabilityState] = useState<string | null>(null);

  async function advance(order: Task, to: OrderStatus, failureReasonCode?: string) {
    setBusyId(order.id);
    setNote(null);
    try {
      await ordersApi.status(order.id, { toStatus: to, failureReasonCode });
      reload();
    } catch (err) {
      setNote(err instanceof ApiError ? err.message : 'Update failed');
    } finally {
      setBusyId(null);
    }
  }

  async function setAvailability(a: string) {
    await agentApi.setAvailability(a);
    setAvailabilityState(a);
  }

  return (
    <AppShell requireRole="AGENT">
      <div className="mb-5 flex items-center justify-between">
        <div>
          <Eyebrow>Delivery queue</Eyebrow>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">My tasks</h1>
        </div>
        <div className="flex gap-1">
          {['AVAILABLE', 'ON_DUTY', 'OFFLINE'].map((a) => (
            <button key={a} onClick={() => setAvailability(a)}
              className={`rounded border px-2 py-1 font-mono text-[10px] uppercase hover:border-stamp ${availability === a ? 'border-stamp text-stamp' : 'border-rule'}`}>
              {a}
            </button>
          ))}
        </div>
      </div>

      {note && <ErrorNote>{note}</ErrorNote>}
      {loading && <Spinner />}
      {error && <ErrorNote>{error}</ErrorNote>}
      {data && data.length === 0 && <EmptyState title="Nothing in your queue" hint="New assignments will appear here." />}

      <div className="space-y-4">
        {data?.map((o) => {
          const next = NEXT[o.currentStatus];
          return (
            <Card key={o.id} className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-mono text-sm font-semibold">{o.orderNumber}</span>
                <StatusPill status={o.currentStatus} />
              </div>
              <div className="grid gap-2 text-sm sm:grid-cols-2">
                <div>
                  <p className="eyebrow">Pickup · {o.pickupZone.code}</p>
                  <p className="font-mono text-xs text-ink/70">{o.pickupAddress.line1}, {o.pickupAddress.city} {o.pickupAddress.pincode}</p>
                  <p className="font-mono text-xs text-ink/50">{o.pickupAddress.contactName} · {o.pickupAddress.contactPhone}</p>
                </div>
                <div>
                  <p className="eyebrow">Drop · {o.dropZone.code}</p>
                  <p className="font-mono text-xs text-ink/70">{o.dropAddress.line1}, {o.dropAddress.city} {o.dropAddress.pincode}</p>
                  <p className="font-mono text-xs text-ink/50">{o.dropAddress.contactName} · {o.dropAddress.contactPhone}</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {next && (
                  <Button onClick={() => advance(o, next)} disabled={busyId === o.id}>
                    Mark {next.replace(/_/g, ' ')}
                  </Button>
                )}
                {o.currentStatus === 'OUT_FOR_DELIVERY' && (
                  <Button variant="danger" disabled={busyId === o.id}
                    onClick={() => advance(o, 'FAILED', 'CUSTOMER_UNAVAILABLE')}>
                    Mark failed
                  </Button>
                )}
              </div>
            </Card>
          );
        })}
      </div>
    </AppShell>
  );
}
