'use client';

import { useEffect, useRef, useState } from 'react';
import { adminApi, ApiError, type PricingBreakdown } from '@/lib/api';
import { useAsync } from '@/lib/hooks';
import { AppShell } from '@/components/AppShell';
import { WaybillPanel } from '@/components/WaybillPanel';
import { Card, Eyebrow, ErrorNote, Field, Input, Spinner } from '@/components/ui';

export default function RateSimulatorPage() {
  const zones = useAsync(() => adminApi.zones());
  const cards = useAsync(() => adminApi.rateCards());
  const [form, setForm] = useState({ lengthCm: 30, breadthCm: 20, heightCm: 15, actualWeightGrams: 1200, orderType: 'B2C', paymentType: 'COD', pickupZoneId: '', dropZoneId: '', declaredValueRupees: 1500 });
  const [result, setResult] = useState<PricingBreakdown | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>();

  // Default zone pick once loaded (Bhopal -> Pune to mirror the README example).
  useEffect(() => {
    if (zones.data && !form.pickupZoneId) {
      const bho = zones.data.find((z) => z.code === 'MP-BHO')?.id ?? zones.data[0]?.id ?? '';
      const pun = zones.data.find((z) => z.code === 'MH-PUN')?.id ?? zones.data[1]?.id ?? '';
      setForm((f) => ({ ...f, pickupZoneId: bho, dropZoneId: pun }));
    }
  }, [zones.data, form.pickupZoneId]);

  useEffect(() => {
    if (!form.pickupZoneId || !form.dropZoneId) return;
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      try {
        const r = await adminApi.simulate({
          lengthCm: form.lengthCm, breadthCm: form.breadthCm, heightCm: form.heightCm,
          actualWeightGrams: form.actualWeightGrams, orderType: form.orderType, paymentType: form.paymentType,
          pickupZoneId: form.pickupZoneId, dropZoneId: form.dropZoneId,
          declaredValuePaise: Math.round(form.declaredValueRupees * 100),
        });
        setResult(r); setErr(null);
      } catch (e) { setResult(null); setErr(e instanceof ApiError ? e.message : 'Simulation failed'); }
    }, 350);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(form)]);

  return (
    <AppShell requireRole="ADMIN">
      <Eyebrow>Pricing</Eyebrow>
      <h1 className="mt-1 text-2xl font-semibold tracking-tight">Rate simulator</h1>
      <p className="mt-1 text-sm text-muted">Dry-run a shipment against the active rate cards. The number matches what a customer would be quoted.</p>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_360px]">
        <Card className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Pickup zone">
              <select value={form.pickupZoneId} onChange={(e) => setForm({ ...form, pickupZoneId: e.target.value })} className="mt-1 w-full rounded border border-line bg-overlay/60 px-3 py-2 font-mono text-sm">
                {zones.data?.map((z) => <option key={z.id} value={z.id}>{z.code}</option>)}
              </select>
            </Field>
            <Field label="Drop zone">
              <select value={form.dropZoneId} onChange={(e) => setForm({ ...form, dropZoneId: e.target.value })} className="mt-1 w-full rounded border border-line bg-overlay/60 px-3 py-2 font-mono text-sm">
                {zones.data?.map((z) => <option key={z.id} value={z.id}>{z.code}</option>)}
              </select>
            </Field>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <Field label="L (cm)"><Input type="number" value={form.lengthCm} onChange={(e) => setForm({ ...form, lengthCm: +e.target.value })} /></Field>
            <Field label="B (cm)"><Input type="number" value={form.breadthCm} onChange={(e) => setForm({ ...form, breadthCm: +e.target.value })} /></Field>
            <Field label="H (cm)"><Input type="number" value={form.heightCm} onChange={(e) => setForm({ ...form, heightCm: +e.target.value })} /></Field>
          </div>
          <Field label="Actual weight (g)"><Input type="number" value={form.actualWeightGrams} onChange={(e) => setForm({ ...form, actualWeightGrams: +e.target.value })} /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Order type">
              <select value={form.orderType} onChange={(e) => setForm({ ...form, orderType: e.target.value })} className="mt-1 w-full rounded border border-line bg-overlay/60 px-3 py-2 font-mono text-sm"><option>B2C</option><option>B2B</option></select>
            </Field>
            <Field label="Payment">
              <select value={form.paymentType} onChange={(e) => setForm({ ...form, paymentType: e.target.value })} className="mt-1 w-full rounded border border-line bg-overlay/60 px-3 py-2 font-mono text-sm"><option>PREPAID</option><option>COD</option></select>
            </Field>
          </div>
          {form.paymentType === 'COD' && <Field label="Declared value (₹)"><Input type="number" value={form.declaredValueRupees} onChange={(e) => setForm({ ...form, declaredValueRupees: +e.target.value })} /></Field>}

          <div>
            <Eyebrow>Active rate cards</Eyebrow>
            <ul className="mt-2 space-y-1 font-mono text-xs text-muted">
              {cards.data?.filter((c) => (c as { isActive: boolean }).isActive).map((c) => (
                <li key={(c as { id: string }).id}>{(c as { name: string }).name} · {(c as { orderType: string }).orderType} · {(c as { scope: string }).scope}</li>
              ))}
            </ul>
          </div>
        </Card>

        <div className="lg:sticky lg:top-6 lg:self-start">
          {err && <ErrorNote>{err}</ErrorNote>}
          {!err && result && <WaybillPanel breakdown={result} />}
          {!err && !result && <Spinner label="Simulating…" />}
        </div>
      </div>
    </AppShell>
  );
}
