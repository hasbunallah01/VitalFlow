/**
 * Pillar grid — five cards, one per pillar, showing points and
 * contribution breakdown. Click a card to expand the metric
 * breakdown (drill-down for 6A; not yet wired to navigation).
 */

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { cn } from '@/lib/utils';

type Pillar = {
  id: string;
  label: string;
  maxPoints: number;
  points: number;
  metrics: Array<{
    id: string;
    label: string;
    value: number;
    contribution: number;
  }>;
};

const PILLAR_DESCRIPTIONS: Record<string, string> = {
  cashflow: 'Whether money is reliably coming in and going out without surprises.',
  revenue: 'How predictable and diversified your income is.',
  expenses: 'How disciplined your spending is relative to your income.',
  liquidity: 'How much runway you have if revenue stopped tomorrow.',
  risk: 'The signals lenders look for: missed payments, overdrafts, large outflows.',
};

export function PillarGrid({ pillars }: { pillars: Pillar[] }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {pillars.map((p) => {
        const ratio = p.maxPoints > 0 ? p.points / p.maxPoints : 0;
        return (
          <Card key={p.id}>
            <CardHeader>
              <div className="flex items-baseline justify-between gap-3">
                <CardTitle>{p.label}</CardTitle>
                <span
                  className="font-tabular text-sm font-semibold text-ink-700"
                  data-numeric
                >
                  {p.points.toFixed(1)}<span className="text-ink-300">/{p.maxPoints}</span>
                </span>
              </div>
              <CardDescription>{PILLAR_DESCRIPTIONS[p.id]}</CardDescription>
            </CardHeader>
            <CardContent>
              <PillarBar ratio={ratio} />
              <ul className="mt-4 space-y-2">
                {p.metrics.map((m) => {
                  const metricRatio = m.contribution / (p.maxPoints / p.metrics.length);
                  return (
                    <li key={m.id} className="flex items-center justify-between gap-2 text-sm">
                      <span className="truncate text-ink-700">{m.label}</span>
                      <span
                        className={cn(
                          'shrink-0 font-tabular text-xs',
                          metricRatio >= 0.75 ? 'text-positive' : metricRatio >= 0.5 ? 'text-warning' : 'text-negative',
                        )}
                        data-numeric
                      >
                        {m.contribution.toFixed(1)}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

function PillarBar({ ratio }: { ratio: number }) {
  const pct = Math.max(0, Math.min(1, ratio));
  const tone = pct >= 0.75 ? 'bg-positive' : pct >= 0.5 ? 'bg-warning' : 'bg-negative';
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-ink-900/5">
      <div
        className={cn('h-full rounded-full transition-all', tone)}
        style={{ width: `${pct * 100}%` }}
      />
    </div>
  );
}
