import Link from 'next/link';

export default function HomePage() {
  return (
    <main className="mx-auto max-w-2xl px-6 py-16">
      <p className="eyebrow">Last-Mile Delivery Tracker</p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight">
        Freight, priced and tracked with an audit trail.
      </h1>
      <p className="mt-4 max-w-prose text-ink/70">
        A configurable rate engine, explainable auto-assignment, and an immutable
        tracking history. This is the Phase&nbsp;1 skeleton — the foundation is
        live; features arrive in later phases.
      </p>

      <div className="mt-8 flex flex-wrap gap-3">
        <Link
          href="/login"
          className="rounded border border-ink bg-ink px-4 py-2 text-paper transition-colors hover:bg-stamp hover:border-stamp"
        >
          Log in
        </Link>
        <Link
          href="/demo"
          className="rounded border border-rule px-4 py-2 transition-colors hover:border-ink"
        >
          Demo credentials
        </Link>
      </div>
    </main>
  );
}
