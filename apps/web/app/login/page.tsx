'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { authApi, ApiError } from '@/lib/api';
import { useAuth, homeForRole } from '@/lib/auth';
import { Button, Card, Eyebrow, ErrorNote, Field, Input } from '@/components/ui';

const DEMO = [
  { role: 'Admin', email: 'admin@demo.io' },
  { role: 'Customer', email: 'customer@demo.io' },
  { role: 'Agent', email: 'agent@demo.io' },
];

export default function LoginPage() {
  const router = useRouter();
  const { refresh } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const { user } = await authApi.login(email, password);
      await refresh();
      router.replace(homeForRole(user.role));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to reach the server');
      setLoading(false);
    }
  }

  function quickFill(demoEmail: string) {
    setEmail(demoEmail);
    setPassword('Demo@1234');
  }

  return (
    <main className="mx-auto max-w-sm px-6 py-16">
      <Eyebrow>Sign in</Eyebrow>
      <h1 className="mt-2 text-2xl font-semibold tracking-tight">Access your account</h1>

      <form onSubmit={submit} className="mt-6 space-y-4" noValidate>
        <Field label="Email">
          <Input type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </Field>
        <Field label="Password">
          <Input type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
        </Field>
        {error && <ErrorNote>{error}</ErrorNote>}
        <Button type="submit" disabled={loading} className="w-full">
          {loading ? 'Signing in…' : 'Sign in'}
        </Button>
      </form>

      <Card className="mt-6">
        <Eyebrow>Demo logins · password Demo@1234</Eyebrow>
        <div className="mt-3 space-y-1">
          {DEMO.map((d) => (
            <button
              key={d.email}
              onClick={() => quickFill(d.email)}
              className="flex w-full items-center justify-between rounded border border-line px-3 py-1.5 text-left text-sm hover:border-stamp"
            >
              <span>{d.role}</span>
              <span className="font-mono text-xs text-muted">{d.email}</span>
            </button>
          ))}
        </div>
      </Card>

      <p className="mt-4 text-center text-sm text-muted">
        New customer? <Link href="/register" className="text-stamp underline">Create an account</Link>
      </p>
    </main>
  );
}
