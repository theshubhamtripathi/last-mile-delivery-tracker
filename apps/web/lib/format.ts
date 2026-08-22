import { formatINR as sharedFormatINR } from '@lmd/shared/money';

/** Currency formatting comes from the one shared helper (charter §19). */
export const formatINR = sharedFormatINR;

export function formatWeight(grams: number): string {
  return `${(grams / 1000).toFixed(2)} kg`;
}

export function formatDateTime(iso: string | Date | null | undefined): string {
  if (!iso) return '—';
  const d = typeof iso === 'string' ? new Date(iso) : iso;
  return new Intl.DateTimeFormat('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(d);
}

export function formatDate(iso: string | Date | null | undefined): string {
  if (!iso) return '—';
  const d = typeof iso === 'string' ? new Date(iso) : iso;
  return new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium' }).format(d);
}
