'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useAuth } from '@/lib/auth';
import type { Role } from '@/lib/api';
import { Spinner } from './ui';

const NAV: Record<Role, { href: string; label: string }[]> = {
  CUSTOMER: [
    { href: '/orders', label: 'My orders' },
    { href: '/orders/new', label: 'New order' },
  ],
  AGENT: [{ href: '/tasks', label: 'My tasks' }],
  ADMIN: [
    { href: '/admin', label: 'Dashboard' },
    { href: '/admin/orders', label: 'Orders' },
    { href: '/admin/rate-cards', label: 'Rate simulator' },
    { href: '/admin/zones', label: 'Zones' },
    { href: '/admin/notifications', label: 'Notifications' },
    { href: '/admin/audit', label: 'Audit' },
  ],
};

/**
 * Shell for authenticated pages: role-based nav plus a client-side auth guard
 * that bounces unauthenticated visitors (or the wrong role) to /login.
 */
export function AppShell({
  children,
  requireRole,
}: {
  children: React.ReactNode;
  requireRole?: Role;
}) {
  const { user, loading, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (loading) return;
    if (!user) router.replace('/login');
    else if (requireRole && user.role !== requireRole) router.replace('/login');
  }, [user, loading, requireRole, router]);

  if (loading || !user) {
    return (
      <div className="mx-auto max-w-md px-6 py-20">
        <Spinner label="Checking your session…" />
      </div>
    );
  }

  const links = NAV[user.role];

  return (
    <div className="min-h-screen">
      <header className="border-b border-rule bg-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-2 px-5 py-3">
          <Link href="/" className="font-mono text-sm font-semibold tracking-tight">
            LMD
          </Link>
          <nav className="flex flex-1 flex-wrap gap-x-4 gap-y-1 text-sm">
            {links.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className={`rounded px-1 py-0.5 ${
                  pathname === l.href ? 'font-medium text-stamp' : 'text-ink/70 hover:text-ink'
                }`}
              >
                {l.label}
              </Link>
            ))}
          </nav>
          <div className="flex items-center gap-3 text-xs text-ink/60">
            <span className="font-mono">{user.fullName} · {user.role}</span>
            <button
              onClick={() => logout().then(() => router.replace('/login'))}
              className="rounded border border-rule px-2 py-1 hover:border-ink"
            >
              Log out
            </button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-5 py-8">{children}</main>
    </div>
  );
}
