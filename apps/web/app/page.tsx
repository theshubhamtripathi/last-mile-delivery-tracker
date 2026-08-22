'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function HomePage() {
  const router = useRouter();
  const [tn, setTn] = useState('');

  return (
    <main className="mx-auto max-w-2xl px-6 py-16">
      <p className="eyebrow">Last-Mile Delivery Tracker</p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight">
        Freight, priced and tracked with an audit trail.
      </h1>
      <p className="mt-4 max-w-prose text-ink/70">
        A configurable rate engine, explainable auto-assignment, and an immutable,
        hash-chained tracking history. Track any shipment below — no login needed.
      </p>

      <form
        onSubmit={(e) => { e.preventDefault(); if (tn.trim()) router.push(`/track/${tn.trim()}`); }}
        className="mt-8 flex gap-2"
      >
        <input
          value={tn}
          onChange={(e) => setTn(e.target.value)}
          placeholder="LMD-2608-000001"
          aria-label="Tracking number"
          className="flex-1 rounded border border-rule bg-white px-3 py-2 font-mono text-sm focus:border-stamp focus:outline-none focus:ring-2 focus:ring-stamp/40"
        />
        <button type="submit" className="rounded border border-ink bg-ink px-4 py-2 text-paper transition-colors hover:bg-stamp hover:border-stamp">
          Track
        </button>
      </form>

      <div className="mt-6 flex flex-wrap gap-3 text-sm">
        <Link href="/login" className="rounded border border-rule px-4 py-2 transition-colors hover:border-ink">Log in</Link>
        <Link href="/register" className="rounded border border-rule px-4 py-2 transition-colors hover:border-ink">Register</Link>
        <Link href="/demo" className="rounded border border-rule px-4 py-2 transition-colors hover:border-ink">Demo credentials</Link>
      </div>
    </main>
  );
}
