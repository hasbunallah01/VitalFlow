import { format, formatDistanceToNow, parseISO } from 'date-fns';

/**
 * Format a Date (or ISO string) for display.
 *   2026-08-26 → "Aug 26, 2026"
 */
export function formatDate(d: Date | string | null | undefined, fmt = 'MMM d, yyyy'): string {
  if (!d) return '—';
  const date = typeof d === 'string' ? parseISO(d) : d;
  try { return format(date, fmt); } catch { return '—'; }
}

/**
 * "2 hours ago" / "3 days ago" — for activity feeds.
 */
export function timeAgo(d: Date | string | null | undefined): string {
  if (!d) return '—';
  const date = typeof d === 'string' ? parseISO(d) : d;
  try { return formatDistanceToNow(date, { addSuffix: true }); } catch { return '—'; }
}

/**
 * Format a number as a currency string. Defaults to USD when no code
 * is supplied. Numbers are assumed to already be in major units.
 */
export function formatCurrency(
  amount: number | null | undefined,
  currency = 'USD',
  opts: { compact?: boolean; sign?: boolean } = {},
): string {
  if (amount == null) return '—';
  const sign = opts.sign && amount > 0 ? '+' : '';
  try {
    const formatter = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      notation: opts.compact ? 'compact' : 'standard',
      maximumFractionDigits: opts.compact ? 1 : 0,
    });
    return sign + formatter.format(amount);
  } catch {
    return `${sign}${amount.toFixed(0)}`;
  }
}

/**
 * Format a plain number with thousand separators.
 */
export function formatNumber(
  n: number | null | undefined,
  opts: { compact?: boolean; decimals?: number } = {},
): string {
  if (n == null) return '—';
  try {
    return new Intl.NumberFormat('en-US', {
      notation: opts.compact ? 'compact' : 'standard',
      maximumFractionDigits: opts.decimals ?? 0,
    }).format(n);
  } catch {
    return String(n);
  }
}

/**
 * Format a percentage with sign.
 */
export function formatPercent(value: number, opts: { sign?: boolean } = {}): string {
  if (value == null || isNaN(value)) return '—';
  const sign = opts.sign && value > 0 ? '+' : '';
  return `${sign}${value.toFixed(1)}%`;
}

/**
 * Health band → Tailwind class tokens.
 */
export function bandTokens(band: string | null | undefined): {
  text: string;
  bg: string;
  ring: string;
  hex: string;
  label: string;
} {
  const b = (band ?? '').toLowerCase();
  switch (b) {
    case 'strong':
      return {
        text: 'text-success',
        bg: 'bg-success-muted',
        ring: 'ring-success/20',
        hex: '#12B76A',
        label: 'Strong',
      };
    case 'healthy':
      return {
        text: 'text-success',
        bg: 'bg-brand-teal/10',
        ring: 'ring-brand-teal/20',
        hex: '#35CFA5',
        label: 'Healthy',
      };
    case 'watch':
      return {
        text: 'text-warning',
        bg: 'bg-warning-muted',
        ring: 'ring-warning/20',
        hex: '#F79009',
        label: 'Watch',
      };
    case 'fragile':
      return {
        text: 'text-band-fragile',
        bg: 'bg-danger-muted',
        ring: 'ring-danger/20',
        hex: '#F97066',
        label: 'Fragile',
      };
    case 'critical':
      return {
        text: 'text-danger',
        bg: 'bg-danger-muted',
        ring: 'ring-danger/20',
        hex: '#F04438',
        label: 'Critical',
      };
    default:
      return {
        text: 'text-text-secondary',
        bg: 'bg-canvas',
        ring: 'ring-border',
        hex: '#98A2B3',
        label: '—',
      };
  }
}

/**
 * Funding outreach status → tokens.
 */
export function outreachStatusTokens(status: string | null | undefined): {
  text: string;
  bg: string;
} {
  switch (status) {
    case 'drafted': return { text: 'text-text-secondary', bg: 'bg-canvas' };
    case 'approved': return { text: 'text-brand', bg: 'bg-brand/10' };
    case 'shared': return { text: 'text-brand-deep', bg: 'bg-brand-deep/10' };
    case 'viewed': return { text: 'text-warning', bg: 'bg-warning-muted' };
    case 'completed': return { text: 'text-success', bg: 'bg-success-muted' };
    case 'revoked': return { text: 'text-danger', bg: 'bg-danger-muted' };
    case 'failed': return { text: 'text-danger', bg: 'bg-danger-muted' };
    default: return { text: 'text-text-secondary', bg: 'bg-canvas' };
  }
}

/**
 * Eligibility status → tokens.
 */
export function eligibilityTokens(status: string | null | undefined): {
  text: string;
  bg: string;
} {
  switch (status) {
    case 'eligible':
      return { text: 'text-success', bg: 'bg-success-muted' };
    case 'almost':
    case 'gap_small':
    case 'gap_medium':
    case 'gap_large':
      return { text: 'text-warning', bg: 'bg-warning-muted' };
    case 'blocked':
      return { text: 'text-text-muted', bg: 'bg-canvas' };
    default:
      return { text: 'text-text-secondary', bg: 'bg-canvas' };
  }
}
