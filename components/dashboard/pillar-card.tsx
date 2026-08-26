import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import type { Pillar } from '@/lib/api/types';

const PILLAR_COLORS: Record<string, { bar: string; chip: string }> = {
  cash_flow_stability: { bar: 'bg-brand', chip: 'bg-brand/10 text-brand' },
  revenue_quality: { bar: 'bg-brand-teal', chip: 'bg-brand-teal/10 text-brand-teal' },
  expense_discipline: { bar: 'bg-brand-bright', chip: 'bg-brand-bright/10 text-brand-bright' },
  liquidity_runway: { bar: 'bg-band-watch', chip: 'bg-band-watch/10 text-band-watch' },
  risk_profile: { bar: 'bg-positive', chip: 'bg-positive/10 text-positive' },
};

function strengthLabel(percent: number): { label: string; tone: 'positive' | 'warning' | 'negative' | 'muted' } {
  if (percent >= 80) return { label: 'Strong', tone: 'positive' };
  if (percent >= 60) return { label: 'Solid', tone: 'positive' };
  if (percent >= 40) return { label: 'Building', tone: 'warning' };
  if (percent >= 20) return { label: 'Fragile', tone: 'warning' };
  return { label: 'Critical', tone: 'negative' };
}

export function PillarCard({ pillar }: { pillar: Pillar }) {
  const percent = pillar.maxPoints > 0 ? Math.round((pillar.points / pillar.maxPoints) * 100) : 0;
  const color = PILLAR_COLORS[pillar.id] ?? PILLAR_COLORS.cash_flow_stability!;
  const strength = strengthLabel(percent);

  return (
    <div className="group rounded-card border border-border bg-card p-5 shadow-card transition-shadow hover:shadow-card-hover">
      <div className="flex items-start justify-between">
        <div>
          <div className="text-meta-sm uppercase tracking-wider text-text-secondary">
            {pillar.label}
          </div>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="text-h2 font-bold text-brand-navy tabular-nums">{Math.round(pillar.points)}</span>
            <span className="text-meta text-text-secondary">/ {pillar.maxPoints}</span>
          </div>
        </div>
        <span
          className={`rounded-full px-2.5 py-0.5 text-meta-sm font-medium ${color.chip}`}
        >
          {strength.label}
        </span>
      </div>
      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-canvas">
        <div
          className={`h-full ${color.bar}`}
          style={{ width: `${percent}%` }}
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={percent}
        />
      </div>
      <div className="mt-3 text-meta-sm text-text-secondary">
        {pillar.metrics[0]?.label ? `${pillar.metrics[0].label}: ${formatMetric(pillar.metrics[0].value, pillar.metrics[0]?.id)}` : null}
      </div>
    </div>
  );
}

function formatMetric(value: number, id: string): string {
  if (id?.includes('pct') || id?.includes('ratio')) {
    return `${(value * 100).toFixed(0)}%`;
  }
  if (id?.includes('days') || id?.includes('count')) {
    return value.toFixed(0);
  }
  return value.toFixed(2);
}
