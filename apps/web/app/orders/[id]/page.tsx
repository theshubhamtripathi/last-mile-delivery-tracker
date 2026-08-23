'use client';

import { use, useState } from 'react';
import { ordersApi, ApiError, type PricingBreakdown, type OrderStatus, type TimelineEvent } from '@/lib/api';
import { useAsync } from '@/lib/hooks';
import { AppShell } from '@/components/AppShell';
import { WaybillPanel } from '@/components/WaybillPanel';
import { Timeline } from '@/components/Timeline';
import { StatusPill } from '@/components/StatusPill';
import { Button, Card, Eyebrow, ErrorNote, Field, Input, Spinner } from '@/components/ui';
import { formatDate } from '@/lib/format';

interface OrderDetail {
  id: string;
  orderNumber: string;
  currentStatus: OrderStatus;
  pricingSnapshot: PricingBreakdown;
  pickupZone: { code: string; name: string };
  dropZone: { code: string; name: string };
  pickupAddress: { line1: string; city: string; pincode: string };
  dropAddress: { line1: string; city: string; pincode: string };
  assignedAgent: { user: { fullName: string } } | null;
  promisedDate: string | null;
}

export default function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const order = useAsync(() => ordersApi.get(id) as unknown as Promise<OrderDetail>, [id]);
  const timeline = useAsync(() => ordersApi.tracking(id) as Promise<TimelineEvent[]>, [id]);
  const verify = useAsync(() => ordersApi.verify(id), [id]);

  const [date, setDate] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function reschedule() {
    setBusy(true);
    setMsg(null);
    try {
      await ordersApi.reschedule(id, new Date(date).toISOString());
      order.reload();
      timeline.reload();
      setMsg('Rescheduled and reassigned to a new agent.');
    } catch (err) {
      setMsg(err instanceof ApiError ? err.message : 'Reschedule failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <AppShell requireRole="CUSTOMER">
      {order.loading && <Spinner />}
      {order.error && <ErrorNote>{order.error}</ErrorNote>}
      {order.data && (
        <>
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
            <div>
              <Eyebrow>Order</Eyebrow>
              <h1 className="mt-1 font-mono text-2xl font-semibold tracking-tight">{order.data.orderNumber}</h1>
              <p className="mt-1 font-mono text-xs text-muted">
                {order.data.pickupZone.code} → {order.data.dropZone.code} · promised {formatDate(order.data.promisedDate)}
              </p>
            </div>
            <div className="text-right">
              <StatusPill status={order.data.currentStatus} />
              {verify.data && (
                <p className={`mt-2 font-mono text-xs ${verify.data.valid ? 'text-cleared' : 'text-consign'}`}>
                  chain {verify.data.valid ? 'verified' : 'BROKEN'} · {verify.data.eventsVerified} events
                </p>
              )}
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
            <div className="space-y-6">
              <WaybillPanel breakdown={order.data.pricingSnapshot} />
              {order.data.currentStatus === 'FAILED' && (
                <Card className="border-consign/40 bg-consign/5 space-y-3">
                  <Eyebrow>Delivery failed — reschedule</Eyebrow>
                  <Field label="New delivery date">
                    <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
                  </Field>
                  <Button onClick={reschedule} disabled={!date || busy}>{busy ? 'Rescheduling…' : 'Reschedule delivery'}</Button>
                  {msg && <p className="text-xs text-muted">{msg}</p>}
                </Card>
              )}
              {msg && order.data.currentStatus !== 'FAILED' && <p className="text-xs text-cleared">{msg}</p>}
            </div>

            <Card>
              <Eyebrow>Tracking history</Eyebrow>
              <div className="mt-4">
                {timeline.loading && <Spinner />}
                {timeline.data && <Timeline events={timeline.data} />}
              </div>
            </Card>
          </div>
        </>
      )}
    </AppShell>
  );
}
