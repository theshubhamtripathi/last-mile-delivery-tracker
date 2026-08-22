'use client';

import { useState } from 'react';
import { authApi, ApiError, type SessionUser } from '@/lib/api';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading'>('idle');
  const [user, setUser] = useState<SessionUser | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus('loading');
    setError(null);
    setUser(null);
    try {
      const res = await authApi.login(email, password);
      setUser(res.user);
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : 'Unable to reach the server',
      );
    } finally {
      setStatus('idle');
    }
  }

  return (
    <main className="mx-auto max-w-sm px-6 py-16">
      <p className="eyebrow">Sign in</p>
      <h1 className="mt-2 text-2xl font-semibold tracking-tight">
        Access your account
      </h1>

      <form onSubmit={onSubmit} className="mt-6 space-y-4" noValidate>
        <div>
          <label htmlFor="email" className="block text-sm font-medium">
            Email
          </label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1 w-full rounded border border-rule bg-white px-3 py-2 font-mono text-sm focus:border-stamp focus:outline-none focus:ring-2 focus:ring-stamp/40"
          />
        </div>
        <div>
          <label htmlFor="password" className="block text-sm font-medium">
            Password
          </label>
          <input
            id="password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1 w-full rounded border border-rule bg-white px-3 py-2 font-mono text-sm focus:border-stamp focus:outline-none focus:ring-2 focus:ring-stamp/40"
          />
        </div>

        <button
          type="submit"
          disabled={status === 'loading'}
          className="w-full rounded border border-ink bg-ink px-4 py-2 text-paper transition-colors hover:bg-stamp hover:border-stamp disabled:opacity-60"
        >
          {status === 'loading' ? 'Signing in…' : 'Sign in'}
        </button>
      </form>

      <div aria-live="polite" className="mt-4 text-sm">
        {error && <p className="text-consign">{error}</p>}
        {user && (
          <p className="text-cleared">
            Signed in as <span className="font-mono">{user.email}</span> ·{' '}
            {user.role}
          </p>
        )}
      </div>
    </main>
  );
}
