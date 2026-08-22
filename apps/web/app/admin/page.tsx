'use client';

import { adminApi } from '@/lib/api';
import { useAsync } from '@/lib/hooks';
import { AppShell } from '@/components/AppShell';
import { BarChart } from '@/components/BarChart';
import { Card, Eyebrow, ErrorNote, Spinner } from '@/components/ui';
import { formatINR } from '@/lib/format';

interface Metrics {
  ordersByStatus: { status: string; count: number }[];
  zoneLoad: { zone: string; count: number }[];
  agentUtilisation: { agentCode: string; name: string; homeZone: string; availability: string; activeOrderCount: number; maxConcurrentOrders: number; utilisation: number }[];
  totals: { totalOrders: number; deliveredOrders: number; deliveredRevenuePaise: number; failureRate: number };
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <p className="eyebrow">{label}</p>
      <p className="mt-2 font-mono text-2xl font-semibold tabular-nums">{value}</p>
    </Card>
  );
}

export default function AdminDashboard() {
  const { data, loading, error } = useAsync(() => adminApi.metrics() as unknown as Promise<Metrics>);

  return (
    <AppShell requireRole="ADMIN">
      <Eyebrow>Operations</Eyebrow>
      <h1 className="mt-1 text-2xl font-semibold tracking-tight">Dashboard</h1>

      {loading && <Spinner />}
      {error && <ErrorNote>{error}</ErrorNote>}
      {data && (
        <div className="mt-6 space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Stat label="Total orders" value={String(data.totals.totalOrders)} />
            <Stat label="Delivered" value={String(data.totals.deliveredOrders)} />
            <Stat label="Delivered revenue" value={formatINR(data.totals.deliveredRevenuePaise)} />
            <Stat label="Failure rate" value={`${Math.round(data.totals.failureRate * 100)}%`} />
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <Eyebrow>Orders by status</Eyebrow>
              <div className="mt-4"><BarChart data={data.ordersByStatus.map((s) => ({ label: s.status, value: s.count }))} /></div>
            </Card>
            <Card>
              <Eyebrow>Zone load (pickup)</Eyebrow>
              <div className="mt-4"><BarChart data={data.zoneLoad.map((z) => ({ label: z.zone, value: z.count }))} color="#0E7A5F" /></div>
            </Card>
          </div>

          <Card>
            <Eyebrow>Agent utilisation</Eyebrow>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-rule text-left font-mono text-xs uppercase tracking-wide text-ink/50">
                  <tr><th className="px-3 py-2">Agent</th><th className="px-3 py-2">Zone</th><th className="px-3 py-2">Availability</th><th className="px-3 py-2">Load</th></tr>
                </thead>
                <tbody>
                  {data.agentUtilisation.map((a) => (
                    <tr key={a.agentCode} className="border-b border-rule last:border-0">
                      <td className="px-3 py-2 font-mono">{a.agentCode} · {a.name}</td>
                      <td className="px-3 py-2 font-mono text-xs">{a.homeZone}</td>
                      <td className="px-3 py-2 font-mono text-xs">{a.availability}</td>
                      <td className="px-3 py-2 font-mono tabular-nums">{a.activeOrderCount}/{a.maxConcurrentOrders}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}
    </AppShell>
  );
}
