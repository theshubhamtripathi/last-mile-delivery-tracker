'use client';

import { adminApi } from '@/lib/api';
import { useAsync } from '@/lib/hooks';
import { AppShell } from '@/components/AppShell';
import { Card, Eyebrow, ErrorNote, Spinner, EmptyState } from '@/components/ui';
import { formatDateTime } from '@/lib/format';

export default function AuditPage() {
  const { data, loading, error } = useAsync(() => adminApi.auditLogs());

  return (
    <AppShell requireRole="ADMIN">
      <Eyebrow>Accountability</Eyebrow>
      <h1 className="mt-1 text-2xl font-semibold tracking-tight">Audit log</h1>
      <p className="mt-1 text-sm text-ink/60">Every config change and status override, with before/after state and the actor.</p>

      {loading && <Spinner />}
      {error && <ErrorNote>{error}</ErrorNote>}
      {data && data.length === 0 && <EmptyState title="No audit entries yet" />}
      {data && data.length > 0 && (
        <Card className="mt-6 p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-rule text-left font-mono text-xs uppercase tracking-wide text-ink/50">
                <tr><th className="px-4 py-3">When</th><th className="px-4 py-3">Actor</th><th className="px-4 py-3">Entity</th><th className="px-4 py-3">Action</th></tr>
              </thead>
              <tbody>
                {data.map((r) => {
                  const a = r as { id: string; createdAt: string; entityType: string; entityId: string; action: string; actor: { fullName: string; role: string } };
                  return (
                    <tr key={a.id} className="border-b border-rule last:border-0">
                      <td className="px-4 py-2 text-xs text-ink/60">{formatDateTime(a.createdAt)}</td>
                      <td className="px-4 py-2 text-xs">{a.actor.fullName} <span className="font-mono text-ink/40">({a.actor.role})</span></td>
                      <td className="px-4 py-2 font-mono text-xs">{a.entityType}</td>
                      <td className="px-4 py-2 font-mono text-xs">{a.action}</td>
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
