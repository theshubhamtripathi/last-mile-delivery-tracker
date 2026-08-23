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

const ROLE_TONE: Record<Role, string> = {
  ADMIN: 'text-stamp',
  AGENT: 'text-cleared',
  CUSTOMER: 'text-sky',
};

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
      <div className="mx-auto max-w-md px-6 py-24">
        <Spinner label="Checking your session…" />
      </div>
    );
  }

  const links = NAV[user.role];

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-30 border-b border-line/70 bg-base/70 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-6 gap-y-2 px-5 py-3">
          <Link href="/" className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-grad-brand font-mono text-sm font-bold text-white shadow-glow-soft">
              L
            </span>
            <span className="font-semibold tracking-tight">
              Last-Mile <span className="text-faint">Tracker</span>
            </span>
          </Link>
          <nav className="flex flex-1 flex-wrap items-center gap-1 text-sm">
            {links.map((l) => {
              const active = pathname === l.href;
              return (
                <Link
                  key={l.href}
                  href={l.href}
                  className={`rounded-lg px-3 py-1.5 transition-colors ${
                    active
                      ? 'bg-overlay text-ink ring-1 ring-line'
                      : 'text-muted hover:bg-overlay/60 hover:text-ink'
                  }`}
                >
                  {l.label}
                </Link>
              );
            })}
          </nav>
          <div className="flex items-center gap-3">
            <div className="hidden text-right sm:block">
              <p className="text-sm font-medium leading-tight text-ink">{user.fullName}</p>
              <p className={`font-mono text-[10px] uppercase tracking-wide ${ROLE_TONE[user.role]}`}>
                {user.role}
              </p>
            </div>
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-overlay font-mono text-xs font-semibold text-ink ring-1 ring-line">
              {user.fullName.split(' ').map((w) => w[0]).slice(0, 2).join('')}
            </span>
            <button
              onClick={() => logout().then(() => router.replace('/login'))}
              className="rounded-lg border border-line px-2.5 py-1.5 text-xs text-muted transition-colors hover:border-consign/50 hover:text-consign"
            >
              Log out
            </button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-5 py-8">{children}</main>
    </div>
  );
}
