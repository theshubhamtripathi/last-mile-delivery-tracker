'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ordersApi, ApiError, type QuoteResponse } from '@/lib/api';
import { AppShell } from '@/components/AppShell';
import { WaybillPanel } from '@/components/WaybillPanel';
import { Button, Card, Eyebrow, ErrorNote, Field, Input } from '@/components/ui';

interface Addr { line1: string; pincode: string; city: string; state: string; contactName: string; contactPhone: string }
const emptyAddr = (): Addr => ({ line1: '', pincode: '', city: '', state: '', contactName: '', contactPhone: '' });

export default function NewOrderPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [pickup, setPickup] = useState<Addr>({ ...emptyAddr(), pincode: '462001', city: 'Bhopal', state: 'MP', line1: 'MP Nagar', contactName: 'Sender', contactPhone: '+919000000001' });
  const [drop, setDrop] = useState<Addr>({ ...emptyAddr(), pincode: '411001', city: 'Pune', state: 'MH', line1: 'FC Road', contactName: 'Receiver', contactPhone: '+919000000002' });
  const [pkg, setPkg] = useState({ lengthCm: 30, breadthCm: 20, heightCm: 15, actualWeightGrams: 1200, orderType: 'B2C', paymentType: 'COD', declaredValueRupees: 1500 });

  const [quote, setQuote] = useState<QuoteResponse | null>(null);
  const [quoteErr, setQuoteErr] = useState<string | null>(null);
  const [quoting, setQuoting] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitErr, setSubmitErr] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>();

  const pincodeOk = /^[1-9][0-9]{5}$/.test(pickup.pincode) && /^[1-9][0-9]{5}$/.test(drop.pincode);
  const pkgOk = pkg.lengthCm > 0 && pkg.breadthCm > 0 && pkg.heightCm > 0 && pkg.actualWeightGrams > 0;

  // Live quote: debounced call to the authoritative pricing endpoint.
  useEffect(() => {
    if (!pincodeOk || !pkgOk) { setQuote(null); return; }
    if (timer.current) clearTimeout(timer.current);
    setQuoting(true);
    setQuoteErr(null);
    timer.current = setTimeout(async () => {
      try {
        const q = await ordersApi.quote({
          pickupPincode: pickup.pincode,
          dropPincode: drop.pincode,
          lengthCm: pkg.lengthCm, breadthCm: pkg.breadthCm, heightCm: pkg.heightCm,
          actualWeightGrams: pkg.actualWeightGrams,
          orderType: pkg.orderType, paymentType: pkg.paymentType,
          declaredValuePaise: Math.round(pkg.declaredValueRupees * 100),
        });
        setQuote(q);
      } catch (err) {
        setQuote(null);
        setQuoteErr(err instanceof ApiError ? err.message : 'Could not price this shipment');
      } finally {
        setQuoting(false);
      }
    }, 450);
    return () => timer.current && clearTimeout(timer.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pickup.pincode, drop.pincode, JSON.stringify(pkg)]);

  async function confirm() {
    if (!quote) return;
    setSubmitting(true);
    setSubmitErr(null);
    try {
      const order = await ordersApi.create({
        quoteToken: quote.quoteToken,
        pickupAddress: pickup,
        dropAddress: drop,
      });
      router.replace(`/orders/${(order as { id: string }).id}`);
    } catch (err) {
      setSubmitErr(err instanceof ApiError ? err.message : 'Could not place the order');
      setSubmitting(false);
    }
  }

  return (
    <AppShell requireRole="CUSTOMER">
      <Eyebrow>New shipment</Eyebrow>
      <h1 className="mt-1 text-2xl font-semibold tracking-tight">Create an order</h1>
      <ol className="mt-3 flex gap-2 font-mono text-xs uppercase tracking-wide text-ink/50">
        {['Addresses', 'Package', 'Review'].map((s, i) => (
          <li key={s} className={step === i + 1 ? 'text-stamp' : ''}>{i + 1}. {s}{i < 2 ? ' →' : ''}</li>
        ))}
      </ol>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="space-y-6">
          {step === 1 && (
            <div className="grid gap-6 sm:grid-cols-2">
              <AddressForm title="Pickup" value={pickup} onChange={setPickup} />
              <AddressForm title="Drop" value={drop} onChange={setDrop} />
              <div className="sm:col-span-2 flex justify-end">
                <Button onClick={() => setStep(2)} disabled={!pincodeOk}>Next: package →</Button>
              </div>
            </div>
          )}

          {step === 2 && (
            <Card className="space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <Field label="Length (cm)"><Input type="number" value={pkg.lengthCm} onChange={(e) => setPkg({ ...pkg, lengthCm: +e.target.value })} /></Field>
                <Field label="Breadth (cm)"><Input type="number" value={pkg.breadthCm} onChange={(e) => setPkg({ ...pkg, breadthCm: +e.target.value })} /></Field>
                <Field label="Height (cm)"><Input type="number" value={pkg.heightCm} onChange={(e) => setPkg({ ...pkg, heightCm: +e.target.value })} /></Field>
              </div>
              <Field label="Actual weight (grams)"><Input type="number" value={pkg.actualWeightGrams} onChange={(e) => setPkg({ ...pkg, actualWeightGrams: +e.target.value })} /></Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Order type">
                  <select className="mt-1 w-full rounded border border-rule bg-white px-3 py-2 font-mono text-sm" value={pkg.orderType} onChange={(e) => setPkg({ ...pkg, orderType: e.target.value })}>
                    <option>B2C</option><option>B2B</option>
                  </select>
                </Field>
                <Field label="Payment">
                  <select className="mt-1 w-full rounded border border-rule bg-white px-3 py-2 font-mono text-sm" value={pkg.paymentType} onChange={(e) => setPkg({ ...pkg, paymentType: e.target.value })}>
                    <option>PREPAID</option><option>COD</option>
                  </select>
                </Field>
              </div>
              {pkg.paymentType === 'COD' && (
                <Field label="Declared value (₹)"><Input type="number" value={pkg.declaredValueRupees} onChange={(e) => setPkg({ ...pkg, declaredValueRupees: +e.target.value })} /></Field>
              )}
              <div className="flex justify-between">
                <Button variant="ghost" onClick={() => setStep(1)}>← Back</Button>
                <Button onClick={() => setStep(3)} disabled={!quote}>Review →</Button>
              </div>
            </Card>
          )}

          {step === 3 && (
            <Card className="space-y-4">
              <p className="text-sm text-ink/70">
                Review the charge on the right — it is locked to a quote. Confirming re-verifies the price;
                if a rate changed you will be asked to re-quote.
              </p>
              <div className="font-mono text-xs text-ink/60">
                {pickup.city} ({pickup.pincode}) → {drop.city} ({drop.pincode})
              </div>
              {submitErr && <ErrorNote>{submitErr}</ErrorNote>}
              <div className="flex justify-between">
                <Button variant="ghost" onClick={() => setStep(2)}>← Back</Button>
                <Button onClick={confirm} disabled={!quote || submitting}>{submitting ? 'Placing…' : 'Confirm & place order'}</Button>
              </div>
            </Card>
          )}
        </div>

        {/* Live waybill */}
        <div className="lg:sticky lg:top-6 lg:self-start">
          {quoteErr && <ErrorNote>{quoteErr}</ErrorNote>}
          {!quoteErr && quote && <WaybillPanel breakdown={quote.breakdown} />}
          {!quoteErr && !quote && (
            <Card><p className="text-sm text-ink/50">{quoting ? 'Pricing…' : 'Enter valid pincodes and package details to see the live charge.'}</p></Card>
          )}
        </div>
      </div>
    </AppShell>
  );
}

function AddressForm({ title, value, onChange }: { title: string; value: Addr; onChange: (a: Addr) => void }) {
  const set = (k: keyof Addr) => (e: React.ChangeEvent<HTMLInputElement>) => onChange({ ...value, [k]: e.target.value });
  return (
    <Card className="space-y-3">
      <Eyebrow>{title}</Eyebrow>
      <Field label="Address line"><Input value={value.line1} onChange={set('line1')} /></Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Pincode"><Input value={value.pincode} onChange={set('pincode')} /></Field>
        <Field label="City"><Input value={value.city} onChange={set('city')} /></Field>
      </div>
      <Field label="State"><Input value={value.state} onChange={set('state')} /></Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Contact name"><Input value={value.contactName} onChange={set('contactName')} /></Field>
        <Field label="Contact phone"><Input value={value.contactPhone} onChange={set('contactPhone')} /></Field>
      </div>
    </Card>
  );
}
