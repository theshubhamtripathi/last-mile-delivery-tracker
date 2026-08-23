'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { authApi, ApiError } from '@/lib/api';
import { useAuth, homeForRole } from '@/lib/auth';
import { Button, Eyebrow, ErrorNote, Field, Input } from '@/components/ui';

export default function RegisterPage() {
  const router = useRouter();
  const { refresh } = useAuth();
  const [form, setForm] = useState({ fullName: '', email: '', phone: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function set(k: keyof typeof form) {
    return (e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, [k]: e.target.value });
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const { user } = await authApi.register(form);
      await refresh();
      router.replace(homeForRole(user.role));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Registration failed');
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto max-w-sm px-6 py-16">
      <Eyebrow>Create account</Eyebrow>
      <h1 className="mt-2 text-2xl font-semibold tracking-tight">Register as a customer</h1>
      <form onSubmit={submit} className="mt-6 space-y-4" noValidate>
        <Field label="Full name">
          <Input required value={form.fullName} onChange={set('fullName')} />
        </Field>
        <Field label="Email">
          <Input type="email" required value={form.email} onChange={set('email')} />
        </Field>
        <Field label="Phone" hint="7–15 digits, optional +">
          <Input required value={form.phone} onChange={set('phone')} />
        </Field>
        <Field label="Password" hint="At least 8 characters with a letter and a number">
          <Input type="password" required value={form.password} onChange={set('password')} />
        </Field>
        {error && <ErrorNote>{error}</ErrorNote>}
        <Button type="submit" disabled={loading} className="w-full">
          {loading ? 'Creating…' : 'Create account'}
        </Button>
      </form>
      <p className="mt-4 text-center text-sm text-muted">
        Already have an account? <Link href="/login" className="text-stamp underline">Sign in</Link>
      </p>
    </main>
  );
}
