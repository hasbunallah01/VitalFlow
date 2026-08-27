import { format, formatDistanceToNow, parseISO } from 'date-fns';

/**
 * Format a Date (or ISO string) for display.
 *   2026-08-26 → "Aug 26, 2026"
 */
export function formatDate(d: Date | string | null | undefined, fmt = 'MMM d, yyyy'): string {
  if (!d) return '—';
  const date = typeof d === 'string' ? parseISO(d) : d;
  return format(date, fmt);
}

/**
 * "2 hours ago" / "3 days ago" — for activity feeds.
 */
export function timeAgo(d: Date | string | null | undefined): string {
  if (!d) return '—';
  const date = typeof d === 'string' ? parseISO(d) : d;
  return formatDistanceToNow(date, { addSuffix: true });
}

/**
 * Format a number as a currency string. Defaults to USD when no code
 * is supplied. Numbers are assumed to already be in major units (the
 * API returns 75.4 not 7540).
 */
export function formatCurrency(
  amount: number | null | undefined,
  currency = 'XCD',
  opts: { compact?: boolean; sign?: boolean } = {},
): string {
  if (amount == null) return '—';
  const sign = opts.sign && amount > 0 ? '+' : '';
  const formatter = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    notation: opts.compact ? 'compact' : 'standard',
    maximumFractionDigits: opts.compact ? 1 : 0,
  });
  return sign + formatter.format(amount);
}

/**
 * Format a plain number with thousand separators.
 */
export function formatNumber(
  n: number | null | undefined,
  opts: { compact?: boolean; decimals?: number } = {},
): string {
  if (n == null) return '—';
  return new Intl.NumberFormat('en-US', {
    notation: opts.compact ? 'compact' : 'standard',
    maximumFractionDigits: opts.decimals ?? 0,
  }).format(n);
}

/**
 * Health band → Tailwind color class (text/bg). Use everywhere we
 * render a band chip. Maps to the band colors in tailwind.config.ts.
 */
export function bandColor(band: string | null | undefined): {
  text: string;
  bg: string;
  ring: string;
} {
  const b = (band ?? '').toLowerCase();
  if (b === 'strong') return { text: 'text-positive', bg: 'bg-positive-muted', ring: 'ring-positive/20' };
  if (b === 'healthy') return { text: 'text-band-healthy', bg: 'bg-band-healthy/10', ring: 'ring-brand-turquoise/20' };
  if (b === 'watch') return { text: 'text-warning', bg: 'bg-warning-muted', ring: 'ring-warning/20' };
  if (b === 'fragile') return { text: 'text-band-fragile', bg: 'bg-band-fragile/10', ring: 'ring-band-fragile/20' };
  if (b === 'critical') return { text: 'text-negative', bg: 'bg-negative-muted', ring: 'ring-negative/20' };
  return { text: 'text-text-secondary', bg: 'bg-canvas', ring: 'ring-border' };
}

/**
 * Funding outreach status → Tailwind color classes.
 */
export function outreachStatusColor(status: string | null | undefined): {
  text: string;
  bg: string;
} {
  switch (status) {
    case 'drafted': return { text: 'text-text-secondary', bg: 'bg-canvas' };
    case 'approved': return { text: 'text-brand', bg: 'bg-brand/10' };
    case 'shared': return { text: 'text-brand-deep', bg: 'bg-brand-deep/10' };
    case 'viewed': return { text: 'text-warning', bg: 'bg-warning-muted' };
    case 'completed': return { text: 'text-positive', bg: 'bg-positive-muted' };
    case 'revoked': return { text: 'text-negative', bg: 'bg-negative-muted' };
    case 'failed': return { text: 'text-negative', bg: 'bg-negative-muted' };
    default: return { text: 'text-text-secondary', bg: 'bg-canvas' };
  }
}

/**
 * Eligibility status → Tailwind color classes.
 */
export function eligibilityColor(status: string | null | undefined): {
  text: string;
  bg: string;
  ring: string;
} {
  switch (status) {
    case 'eligible':
      return { text: 'text-positive', bg: 'bg-positive-muted', ring: 'ring-positive/20' };
    case 'almost':
    case 'gap_small':
    case 'gap_medium':
      return { text: 'text-warning', bg: 'bg-warning-muted', ring: 'ring-warning/20' };
    case 'gap_large':
      return { text: 'text-warning', bg: 'bg-warning-muted', ring: 'ring-warning/20' };
    case 'blocked':
      return { text: 'text-text-muted', bg: 'bg-canvas', ring: 'ring-border' };
    default:
      return { text: 'text-text-secondary', bg: 'bg-canvas', ring: 'ring-border' };
  }
}
