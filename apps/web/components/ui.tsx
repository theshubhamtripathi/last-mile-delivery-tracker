import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode } from 'react';

export function Eyebrow({ children }: { children: ReactNode }) {
  return <p className="eyebrow">{children}</p>;
}

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div className={`rounded border border-rule bg-white p-5 ${className}`}>{children}</div>
  );
}

export function Button({
  children,
  variant = 'primary',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'ghost' | 'danger' }) {
  const base =
    'inline-flex items-center justify-center rounded px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-stamp/40';
  const styles = {
    primary: 'border border-ink bg-ink text-paper hover:bg-stamp hover:border-stamp',
    ghost: 'border border-rule text-ink hover:border-ink',
    danger: 'border border-consign text-consign hover:bg-consign hover:text-paper',
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
      <span className="block text-sm font-medium text-ink">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-ink/50">{hint}</span>}
    </label>
  );
}

export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={`mt-1 w-full rounded border border-rule bg-white px-3 py-2 font-mono text-sm focus:border-stamp focus:outline-none focus:ring-2 focus:ring-stamp/40 ${props.className ?? ''}`}
    />
  );
}

export function Spinner({ label = 'Loading…' }: { label?: string }) {
  return (
    <div className="flex items-center gap-2 py-8 text-sm text-ink/60" aria-live="polite">
      <span className="h-3 w-3 animate-pulse rounded-full bg-stamp" />
      {label}
    </div>
  );
}

export function ErrorNote({ children }: { children: ReactNode }) {
  return (
    <p className="rounded border border-consign/40 bg-consign/5 px-3 py-2 text-sm text-consign" role="alert">
      {children}
    </p>
  );
}

export function EmptyState({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="rounded border border-dashed border-rule px-4 py-10 text-center">
      <p className="text-sm font-medium text-ink">{title}</p>
      {hint && <p className="mt-1 text-xs text-ink/50">{hint}</p>}
    </div>
  );
}
