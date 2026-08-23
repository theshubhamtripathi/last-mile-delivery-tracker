'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

const FEATURES = [
  { t: 'Configurable rate engine', d: 'Zone, volumetric weight, B2B/B2C and COD — priced by a pure engine with 100% test coverage.', i: '₹' },
  { t: 'Explainable auto-assign', d: 'Every candidate agent scored and persisted, rendered as a “why this agent” panel.', i: '⚡' },
  { t: 'Immutable tracking', d: 'Append-only history with a per-order SHA-256 hash chain you can verify.', i: '🔒' },
  { t: 'Live quote before confirm', d: 'A real expiring quote with a 409 QUOTE_STALE guarantee — the price you see is the price you pay.', i: '✓' },
];

export default function HomePage() {
  const router = useRouter();
  const [tn, setTn] = useState('');

  return (
    <main className="relative overflow-hidden">
      {/* ambient glow */}
      <div className="pointer-events-none absolute -top-40 left-1/2 h-[500px] w-[900px] -translate-x-1/2 rounded-full bg-stamp/10 blur-[120px]" />

      <header className="relative mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-grad-brand font-mono text-sm font-bold text-white shadow-glow-soft">L</span>
          <span className="font-semibold tracking-tight">Last-Mile <span className="text-faint">Tracker</span></span>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <Link href="/login" className="rounded-lg px-3 py-1.5 text-muted transition-colors hover:text-ink">Log in</Link>
          <Link href="/demo" className="rounded-lg bg-grad-brand px-3.5 py-1.5 font-medium text-white shadow-glow-soft transition-all hover:shadow-glow">Demo access</Link>
        </div>
      </header>

      <section className="relative mx-auto max-w-3xl px-6 pb-8 pt-14 text-center">
        <div className="animate-fade-up mb-5 inline-flex items-center gap-2 rounded-full border border-line bg-overlay/60 px-3 py-1 text-xs text-muted">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-cleared" />
          Live demo · no login needed to track
        </div>
        <h1 className="animate-fade-up text-4xl font-semibold leading-[1.1] tracking-tight sm:text-6xl" style={{ animationDelay: '60ms' }}>
          Freight, priced and tracked
          <br />
          <span className="gradient-text">with an audit trail.</span>
        </h1>
        <p className="animate-fade-up mx-auto mt-5 max-w-xl text-balance text-muted" style={{ animationDelay: '120ms' }}>
          A configurable rate engine, explainable auto-assignment, and an immutable,
          hash-chained tracking history — for a last-mile logistics operation.
        </p>

        <form
          onSubmit={(e) => { e.preventDefault(); if (tn.trim()) router.push(`/track/${tn.trim()}`); }}
          className="animate-fade-up mx-auto mt-8 flex max-w-md gap-2"
          style={{ animationDelay: '180ms' }}
        >
          <input
            value={tn}
            onChange={(e) => setTn(e.target.value)}
            placeholder="LMD-2608-000001"
            aria-label="Tracking number"
            className="flex-1 rounded-lg border border-line bg-overlay/60 px-4 py-3 font-mono text-sm text-ink placeholder:text-faint focus:border-stamp/70 focus:outline-none focus:ring-2 focus:ring-stamp/30"
          />
          <button type="submit" className="rounded-lg bg-grad-brand px-5 py-3 font-medium text-white shadow-glow-soft transition-all hover:shadow-glow active:scale-95">
            Track →
          </button>
        </form>
        <p className="animate-fade-in mt-3 text-xs text-faint" style={{ animationDelay: '240ms' }}>
          Try <button onClick={() => router.push('/track/LMD-2608-000001')} className="font-mono text-stamp hover:underline">LMD-2608-000001</button>
        </p>
      </section>

      <section className="relative mx-auto grid max-w-5xl gap-4 px-6 py-12 sm:grid-cols-2 lg:grid-cols-4">
        {FEATURES.map((f, i) => (
          <div key={f.t} className="glass glass-hover animate-fade-up p-5" style={{ animationDelay: `${i * 80}ms` }}>
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-grad-brand-soft text-lg ring-1 ring-stamp/20">{f.i}</span>
            <h3 className="mt-3 text-sm font-semibold text-ink">{f.t}</h3>
            <p className="mt-1.5 text-xs leading-relaxed text-muted">{f.d}</p>
          </div>
        ))}
      </section>

      <footer className="relative mx-auto max-w-5xl px-6 py-10 text-center text-xs text-faint">
        Hand-built · NestJS · Prisma · Next.js · no UI library ·{' '}
        <Link href="/demo" className="text-stamp hover:underline">demo credentials</Link>
      </footer>
    </main>
  );
}
