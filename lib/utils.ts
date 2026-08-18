/**
 * Utility helpers used by every UI component.
 *
 * The `cn` helper is the standard shadcn pattern: merge Tailwind class
 * strings, with later classes winning over earlier ones when there
 * are conflicts (so consumers can override defaults).
 */

import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

export function formatCurrencyMajor(
  amountMinor: bigint,
  currency: string,
): string {
  const negative = amountMinor < 0n;
  const abs = negative ? -amountMinor : amountMinor;
  const integerPart = abs / 100n;
  const fractionalPart = abs % 100n;
  const fractionStr = fractionalPart.toString().padStart(2, '0');
  const formatted = `${integerPart.toLocaleString()}.${fractionStr}`;
  return `${negative ? '−' : ''}${formatted} ${currency}`;
}

export function formatNumber(
  value: number,
  options: { maximumFractionDigits?: number } = {},
): string {
  return new Intl.NumberFormat('en-US', {
    maximumFractionDigits: options.maximumFractionDigits ?? 0,
  }).format(value);
}

export function formatPercent(
  ratio: number,
  options: { maximumFractionDigits?: number } = {},
): string {
  return new Intl.NumberFormat('en-US', {
    style: 'percent',
    maximumFractionDigits: options.maximumFractionDigits ?? 0,
  }).format(ratio);
}

export function bandLabel(band: string): string {
  const map: Record<string, string> = {
    strong: 'Strong',
    healthy: 'Healthy',
    watch: 'Watch',
    fragile: 'Fragile',
    critical: 'Critical',
  };
  return map[band] ?? band;
}

export function bandTone(band: string): 'positive' | 'warning' | 'critical' | 'neutral' {
  if (band === 'strong' || band === 'healthy') return 'positive';
  if (band === 'watch') return 'warning';
  return 'critical';
}
