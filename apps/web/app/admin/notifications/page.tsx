'use client';

import { adminApi } from '@/lib/api';
import { usePolling } from '@/lib/hooks';
import { AppShell } from '@/components/AppShell';
import { Card, Eyebrow, ErrorNote, Spinner } from '@/components/ui';
import { formatDateTime } from '@/lib/format';

export default function NotificationsPage() {
  // Poll so newly-sent messages appear as the worker drains the outbox.
  const { data, loading, error } = usePolling(() => adminApi.notifications(), 5000);

  return (
    <AppShell requireRole="ADMIN">
      <Eyebrow>Outbox</Eyebrow>
      <h1 className="mt-1 text-2xl font-semibold tracking-tight">Notification log</h1>
      <p className="mt-1 text-sm text-ink/60">Transactional outbox drained by the worker every 10s. With no API keys, the console provider marks messages sent.</p>

      {loading && !data && <Spinner />}
      {error && <ErrorNote>{error}</ErrorNote>}
      {data && (
        <Card className="mt-6 p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-rule text-left font-mono text-xs uppercase tracking-wide text-ink/50">
                <tr><th className="px-4 py-3">When</th><th className="px-4 py-3">Channel</th><th className="px-4 py-3">Template</th><th className="px-4 py-3">Recipient</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Message id</th></tr>
              </thead>
              <tbody>
                {data.map((r) => {
                  const n = r as { id: string; channel: string; templateKey: string; recipient: string; status: string; providerMessageId?: string; createdAt: string; order?: { orderNumber: string } };
                  return (
                    <tr key={n.id} className="border-b border-rule last:border-0">
                      <td className="px-4 py-2 text-xs text-ink/60">{formatDateTime(n.createdAt)}</td>
                      <td className="px-4 py-2 font-mono text-xs">{n.channel}</td>
                      <td className="px-4 py-2 font-mono text-xs">{n.templateKey}</td>
                      <td className="px-4 py-2 font-mono text-xs">{n.recipient}</td>
                      <td className="px-4 py-2"><span className={`font-mono text-xs ${n.status === 'SENT' ? 'text-cleared' : n.status === 'FAILED' ? 'text-consign' : 'text-hold'}`}>{n.status}</span></td>
                      <td className="px-4 py-2 font-mono text-[10px] text-ink/40">{n.providerMessageId ?? '—'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </AppShell>
  );
}
