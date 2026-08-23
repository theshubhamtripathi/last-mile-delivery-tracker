import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode } from 'react';

export function Eyebrow({ children }: { children: ReactNode }) {
  return <p className="eyebrow">{children}</p>;
}

export function Card({
  children,
  className = '',
  hover = false,
}: {
  children: ReactNode;
  className?: string;
  hover?: boolean;
}) {
  return (
    <div className={`glass p-5 ${hover ? 'glass-hover' : ''} ${className}`}>{children}</div>
  );
}

export function Button({
  children,
  variant = 'primary',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'ghost' | 'danger' | 'subtle';
}) {
  const base =
    'group relative inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all duration-200 active:scale-[0.97] disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-stamp/50';
  const styles = {
    primary:
      'bg-grad-brand text-white shadow-glow-soft hover:shadow-glow hover:brightness-110',
    ghost:
      'border border-line bg-overlay/50 text-ink hover:border-stamp/50 hover:bg-overlay',
    subtle: 'text-muted hover:text-ink hover:bg-overlay/60',
    danger:
      'border border-consign/40 bg-consign/10 text-consign hover:bg-consign hover:text-white',
  }[variant];
  return (
    <button className={`${base} ${styles}`} {...props}>
      {children}
    </button>
  );
}

export function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-muted">
        {label}
      </span>
      {children}
      {hint && <span className="mt-1 block text-xs text-faint">{hint}</span>}
    </label>
  );
}

export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={`w-full rounded-lg border border-line bg-overlay/60 px-3 py-2.5 font-mono text-sm text-ink placeholder:text-faint transition-colors focus:border-stamp/70 focus:outline-none focus:ring-2 focus:ring-stamp/30 ${props.className ?? ''}`}
    />
  );
}

export function Spinner({ label }: { label?: string }) {
  return (
    <div className="flex items-center gap-3 py-8 text-sm text-muted" aria-live="polite">
      <span className="h-5 w-5 animate-spin rounded-full border-2 border-line border-t-stamp" />
      {label ?? 'Loading…'}
    </div>
  );
}

export function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`skeleton ${className}`} />;
}

export function ErrorNote({ children }: { children: ReactNode }) {
  return (
    <p
      className="animate-fade-in rounded-lg border border-consign/30 bg-consign/10 px-3 py-2 text-sm text-consign"
      role="alert"
    >
      {children}
    </p>
  );
}

export function EmptyState({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="rounded-xl border border-dashed border-line px-4 py-14 text-center">
      <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-overlay text-muted">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
          <path d="M4 7h16M4 12h16M4 17h10" strokeLinecap="round" />
        </svg>
      </div>
      <p className="text-sm font-medium text-ink">{title}</p>
      {hint && <p className="mt-1 text-xs text-faint">{hint}</p>}
    </div>
  );
}

export function StatTile({
  label,
  value,
  accent = 'stamp',
  icon,
}: {
  label: string;
  value: string;
  accent?: 'stamp' | 'cleared' | 'hold' | 'consign';
  icon?: ReactNode;
}) {
  const ring = {
    stamp: 'from-stamp/20 text-stamp',
    cleared: 'from-cleared/20 text-cleared',
    hold: 'from-hold/20 text-hold',
    consign: 'from-consign/20 text-consign',
  }[accent];
  return (
    <div className="glass glass-hover animate-fade-up p-5">
      <div className="flex items-center justify-between">
        <p className="eyebrow">{label}</p>
        {icon && (
          <span className={`flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br ${ring} to-transparent`}>
            {icon}
          </span>
        )}
      </div>
      <p className="mt-3 font-mono text-2xl font-semibold tabular-nums text-ink">{value}</p>
    </div>
  );
}
