'use client';

import Link from 'next/link';
import { publicApi, type TimelineEvent, type OrderStatus } from '@/lib/api';
import { useAsync } from '@/lib/hooks';
import { StatusPill } from '@/components/StatusPill';
import { Timeline } from '@/components/Timeline';
import { Card, Eyebrow, Spinner, ErrorNote } from '@/components/ui';
import { formatINR, formatWeight, formatDate } from '@/lib/format';

interface TrackData {
  orderNumber: string;
  currentStatus: OrderStatus;
  orderType: string;
  paymentType: string;
  route: { from: { code: string; name: string }; to: { code: string; name: string } };
  chargeableWeightGrams: number;
  totalPaise: number;
  promisedDate: string | null;
  attemptCount: number;
  canReschedule: boolean;
  agent: string | null;
  timeline: TimelineEvent[];
}

export default function TrackPage({ params }: { params: { trackingNumber: string } }) {
  const { trackingNumber } = params;
  const { data, loading, error } = useAsync<TrackData>(
    () => publicApi.track(trackingNumber) as unknown as Promise<TrackData>,
    [trackingNumber],
  );

  return (
    <main className="mx-auto max-w-2xl px-5 py-10">
      <div className="mb-6 flex items-center justify-between">
        <Link href="/" className="font-mono text-xs uppercase tracking-widest text-faint hover:text-ink">
          ← Last-Mile
        </Link>
        <Eyebrow>Public tracking</Eyebrow>
      </div>

      {loading && <Spinner label="Fetching shipment…" />}
      {error && <ErrorNote>{error}. Check the tracking number and try again.</ErrorNote>}

      {data && (
        <div className="space-y-6">
          <Card>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="font-mono text-lg font-semibold tracking-tight">{data.orderNumber}</p>
                <p className="mt-1 font-mono text-xs text-muted">
                  {data.route.from.code} → {data.route.to.code} · {data.orderType} · {data.paymentType}
                </p>
              </div>
              <StatusPill status={data.currentStatus} />
            </div>
            <dl className="mt-4 grid grid-cols-2 gap-3 font-mono text-sm sm:grid-cols-4">
              <div><dt className="text-xs text-faint">Weight</dt><dd>{formatWeight(data.chargeableWeightGrams)}</dd></div>
              <div><dt className="text-xs text-faint">Charge</dt><dd>{formatINR(data.totalPaise)}</dd></div>
              <div><dt className="text-xs text-faint">Promised</dt><dd>{formatDate(data.promisedDate)}</dd></div>
              <div><dt className="text-xs text-faint">Attempts</dt><dd>{data.attemptCount}</dd></div>
            </dl>
            {data.agent && (
              <p className="mt-3 text-xs text-muted">Delivery partner: <span className="font-medium">{data.agent}</span></p>
            )}
          </Card>

          {data.canReschedule && (
            <Card className="border-consign/40 bg-consign/5">
              <p className="text-sm font-medium text-consign">This delivery attempt failed.</p>
              <p className="mt-1 text-xs text-muted">
                <Link href="/login" className="text-stamp underline">Log in</Link> to your account to pick a new delivery date — a different agent will be assigned.
              </p>
            </Card>
          )}

          <Card>
            <Eyebrow>Tracking history</Eyebrow>
            <div className="mt-4">
              <Timeline events={data.timeline} />
            </div>
          </Card>
        </div>
      )}
    </main>
  );
}
