'use client';

import { useState } from 'react';
import { ordersApi, adminApi, ApiError, type PricingBreakdown, type OrderStatus, type TimelineEvent } from '@/lib/api';
import { useAsync } from '@/lib/hooks';
import { AppShell } from '@/components/AppShell';
import { WaybillPanel } from '@/components/WaybillPanel';
import { Timeline } from '@/components/Timeline';
import { StatusPill } from '@/components/StatusPill';
import { Button, Card, Eyebrow, ErrorNote, Field, Input, Spinner } from '@/components/ui';

interface Candidate { agentCode: string; distanceKm: number; loadRatio: number; stalenessRatio: number; score: number; usedLiveLocation: boolean }
interface Rejected { agentCode: string; reason: string }
interface AssignmentLog { strategy: string; selectionReason: string; candidateSnapshot: { candidates?: Candidate[]; rejected?: Rejected[] }; createdAt: string }
interface AdminOrder {
  id: string; orderNumber: string; currentStatus: OrderStatus; pricingSnapshot: PricingBreakdown;
  pickupZone: { code: string }; dropZone: { code: string };
  customer: { fullName: string; email: string };
  assignedAgent: { agentCode: string; user: { fullName: string } } | null;
  assignmentLogs: AssignmentLog[];
}

const STATUSES: OrderStatus[] = ['CREATED', 'ASSIGNED', 'PICKED_UP', 'IN_TRANSIT', 'OUT_FOR_DELIVERY', 'DELIVERED', 'FAILED', 'RESCHEDULED', 'CANCELLED'];

export default function AdminOrderDetail({ params }: { params: { id: string } }) {
  const { id } = params;
  const order = useAsync(() => ordersApi.get(id) as unknown as Promise<AdminOrder>, [id]);
  const timeline = useAsync(() => ordersApi.tracking(id) as Promise<TimelineEvent[]>, [id]);
  const agents = useAsync(() => adminApi.agents());

  const [agentId, setAgentId] = useState('');
  const [overrideStatus, setOverrideStatus] = useState<OrderStatus>('ASSIGNED');
  const [reason, setReason] = useState('');
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function run(fn: () => Promise<unknown>, ok: string) {
    setBusy(true); setMsg(null);
    try { await fn(); order.reload(); timeline.reload(); setMsg(ok); }
    catch (err) { setMsg(err instanceof ApiError ? `${err.code}: ${err.message}` : 'Action failed'); }
    finally { setBusy(false); }
  }

  const latestLog = order.data?.assignmentLogs?.[0];

  return (
    <AppShell requireRole="ADMIN">
      {order.loading && <Spinner />}
      {order.error && <ErrorNote>{order.error}</ErrorNote>}
      {order.data && (
        <>
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
            <div>
              <Eyebrow>Manage order</Eyebrow>
              <h1 className="mt-1 font-mono text-2xl font-semibold tracking-tight">{order.data.orderNumber}</h1>
              <p className="mt-1 text-xs text-muted">{order.data.customer.fullName} · {order.data.pickupZone.code} → {order.data.dropZone.code}</p>
            </div>
            <StatusPill status={order.data.currentStatus} />
          </div>

          {msg && <div className="mb-4"><Card className="border-stamp/40 bg-stamp/5"><p className="text-sm">{msg}</p></Card></div>}

          <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
            <div className="space-y-6">
              <WaybillPanel breakdown={order.data.pricingSnapshot} />
            </div>

            <div className="space-y-6">
              {/* Assignment */}
              <Card className="space-y-3">
                <Eyebrow>Assignment</Eyebrow>
                <p className="text-sm text-muted">Currently: {order.data.assignedAgent ? `${order.data.assignedAgent.agentCode} · ${order.data.assignedAgent.user.fullName}` : 'unassigned'}</p>
                <div className="flex flex-wrap items-end gap-2">
                  <Button onClick={() => run(() => ordersApi.assign(id, { strategy: 'AUTO' }), 'Auto-assigned')} disabled={busy}>Auto-assign</Button>
                  <div className="flex items-end gap-2">
                    <label className="text-sm">
                      <span className="block text-xs text-faint">Manual</span>
                      <select value={agentId} onChange={(e) => setAgentId(e.target.value)} className="mt-1 rounded border border-line bg-overlay/60 px-3 py-2 font-mono text-xs">
                        <option value="">Pick agent…</option>
                        {agents.data?.map((a) => <option key={a.id} value={a.id}>{a.agentCode} · {a.homeZone.code} · {a.activeOrderCount}/{a.maxConcurrentOrders} · {a.availability}</option>)}
                      </select>
                    </label>
                    <Button variant="ghost" onClick={() => run(() => ordersApi.assign(id, { agentId }), 'Assigned')} disabled={busy || !agentId}>Assign</Button>
                  </div>
                </div>
              </Card>

              {/* Why this agent */}
              {latestLog && (
                <Card>
                  <Eyebrow>Why this agent · {latestLog.strategy}</Eyebrow>
                  <p className="mt-2 text-xs text-muted">{latestLog.selectionReason}</p>
                  {latestLog.candidateSnapshot.candidates && latestLog.candidateSnapshot.candidates.length > 0 && (
                    <div className="mt-3 overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead className="border-b border-line text-left font-mono uppercase text-faint">
                          <tr><th className="px-2 py-1">Agent</th><th className="px-2 py-1">Dist km</th><th className="px-2 py-1">Load</th><th className="px-2 py-1">Stale</th><th className="px-2 py-1">Score</th></tr>
                        </thead>
                        <tbody>
                          {latestLog.candidateSnapshot.candidates.map((c, i) => (
                            <tr key={c.agentCode} className={`border-b border-line last:border-0 ${i === 0 ? 'bg-cleared/5 font-medium' : ''}`}>
                              <td className="px-2 py-1 font-mono">{c.agentCode}{i === 0 ? ' ✓' : ''}{c.usedLiveLocation ? '' : ' (home)'}</td>
                              <td className="px-2 py-1 font-mono">{c.distanceKm}</td>
                              <td className="px-2 py-1 font-mono">{c.loadRatio}</td>
                              <td className="px-2 py-1 font-mono">{c.stalenessRatio}</td>
                              <td className="px-2 py-1 font-mono">{c.score}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                  {latestLog.candidateSnapshot.rejected && latestLog.candidateSnapshot.rejected.length > 0 && (
                    <p className="mt-2 text-xs text-faint">Rejected: {latestLog.candidateSnapshot.rejected.map((r) => `${r.agentCode} (${r.reason})`).join(', ')}</p>
                  )}
                </Card>
              )}

              {/* Override */}
              <Card className="space-y-3">
                <Eyebrow>Status override</Eyebrow>
                <p className="text-xs text-muted">Overrides are flagged in the timeline and audit log. A reason is required.</p>
                <div className="flex flex-wrap items-end gap-2">
                  <label className="text-sm">
                    <span className="block text-xs text-faint">Set status</span>
                    <select value={overrideStatus} onChange={(e) => setOverrideStatus(e.target.value as OrderStatus)} className="mt-1 rounded border border-line bg-overlay/60 px-3 py-2 font-mono text-xs">
                      {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </label>
                  <Field label="Reason"><Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Why?" /></Field>
                  <Button variant="danger" disabled={busy || !reason} onClick={() => run(() => ordersApi.status(id, { toStatus: overrideStatus, reason }), 'Status overridden')}>Override</Button>
                </div>
              </Card>

              <Card>
                <Eyebrow>Tracking history</Eyebrow>
                <div className="mt-4">{timeline.data && <Timeline events={timeline.data} />}</div>
              </Card>
            </div>
          </div>
        </>
      )}
    </AppShell>
  );
}
