'use client';

import { adminApi } from '@/lib/api';
import { useAsync } from '@/lib/hooks';
import { AppShell } from '@/components/AppShell';
import { Card, Eyebrow, ErrorNote, Spinner } from '@/components/ui';

export default function ZonesPage() {
  const zones = useAsync(() => adminApi.zones());
  const areas = useAsync(() => adminApi.areas());

  return (
    <AppShell requireRole="ADMIN">
      <Eyebrow>Network</Eyebrow>
      <h1 className="mt-1 text-2xl font-semibold tracking-tight">Zones &amp; service areas</h1>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card>
          <Eyebrow>Zones</Eyebrow>
          {zones.loading && <Spinner />}
          {zones.error && <ErrorNote>{zones.error}</ErrorNote>}
          <ul className="mt-3 space-y-1">
            {zones.data?.map((z) => (
              <li key={z.id} className="flex items-center justify-between rounded border border-line px-3 py-2 text-sm">
                <span className="font-mono">{z.code} · {z.name}</span>
                <span className="font-mono text-xs text-faint">{z._count?.serviceAreas ?? 0} areas</span>
              </li>
            ))}
          </ul>
        </Card>

        <Card>
          <Eyebrow>Service areas · {areas.data?.length ?? 0} pincodes</Eyebrow>
          {areas.loading && <Spinner />}
          <div className="mt-3 max-h-[520px] overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 border-b border-line bg-overlay/60 text-left font-mono text-xs uppercase tracking-wide text-faint">
                <tr><th className="px-2 py-2">Pincode</th><th className="px-2 py-2">Area</th><th className="px-2 py-2">Zone</th></tr>
              </thead>
              <tbody>
                {areas.data?.map((a) => {
                  const area = a as { id: string; pincode: string; name: string; city: string; zone: { code: string } };
                  return (
                    <tr key={area.id} className="border-b border-line last:border-0">
                      <td className="px-2 py-1.5 font-mono">{area.pincode}</td>
                      <td className="px-2 py-1.5 text-xs">{area.name}, {area.city}</td>
                      <td className="px-2 py-1.5 font-mono text-xs">{area.zone.code}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </AppShell>
  );
}
