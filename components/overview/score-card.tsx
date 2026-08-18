/**
 * The headline number on the Overview.
 * Premium feel: large tabular numeral, the band as a pill, no glow.
 */

import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { bandLabel, bandTone } from '@/lib/utils';

export function ScoreCard({
  score,
  band,
  monthsAnalyzed,
  periodStart,
  periodEnd,
  confidence,
  currency,
}: {
  score: number;
  band: string;
  monthsAnalyzed: number;
  periodStart: string | null;
  periodEnd: string | null;
  confidence: number;
  currency: string;
}) {
  const tone = bandTone(band);
  return (
    <Card className="overflow-hidden">
      <CardContent className="p-6 sm:p-8">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-ink-500">
              Health score
            </p>
            <div className="mt-2 flex items-baseline gap-3">
              <span
                className="font-tabular text-display-lg font-semibold leading-none tracking-tight text-ink-900"
                data-numeric
              >
                {Math.round(score)}
              </span>
              <span className="text-2xl font-medium text-ink-300">/100</span>
            </div>
            <div className="mt-4 flex items-center gap-2">
              <Badge tone={tone}>{bandLabel(band)}</Badge>
              <span className="text-xs text-ink-500">
                across {monthsAnalyzed} month{monthsAnalyzed === 1 ? '' : 's'}
              </span>
            </div>
          </div>
          <dl className="grid grid-cols-2 gap-x-8 gap-y-3 sm:grid-cols-3 sm:gap-x-10 sm:text-right">
            <div>
              <dt className="text-[11px] font-medium uppercase tracking-wider text-ink-500">Period</dt>
              <dd className="mt-1 font-tabular text-sm text-ink-900" data-numeric>
                {periodStart ? formatRange(periodStart, periodEnd) : '—'}
              </dd>
            </div>
            <div>
              <dt className="text-[11px] font-medium uppercase tracking-wider text-ink-500">Currency</dt>
              <dd className="mt-1 font-tabular text-sm text-ink-900">{currency}</dd>
            </div>
            <div>
              <dt className="text-[11px] font-medium uppercase tracking-wider text-ink-500">Confidence</dt>
              <dd className="mt-1 font-tabular text-sm text-ink-900" data-numeric>
                {(confidence * 100).toFixed(0)}%
              </dd>
            </div>
          </dl>
        </div>
      </CardContent>
    </Card>
  );
}

function formatRange(start: string, end: string | null): string {
  if (!end) return start;
  // start: 2025-07-01, end: 2026-06-29 → "Jul 2025 – Jun 2026"
  const fmt = (s: string) => {
    const d = new Date(s);
    if (Number.isNaN(d.getTime())) return s;
    return d.toLocaleString('en-US', { month: 'short', year: 'numeric' });
  };
  return `${fmt(start)} – ${fmt(end)}`;
}
