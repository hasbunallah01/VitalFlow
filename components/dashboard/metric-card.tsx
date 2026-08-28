import { ArrowDownRight, ArrowUpRight, Minus } from 'lucide-react';
import { cn } from '@/lib/utils/cn';

interface MetricCardProps {
  label: string;
  value: string;
  trend?: { value: number; positive?: boolean } | null;
  /** Optional badge/pill to show on the right (e.g. status). */
  badge?: React.ReactNode;
  className?: string;
}

export function MetricCard({ label, value, trend, badge, className }: MetricCardProps) {
  const isUp = trend?.positive === true || (trend && trend.value > 0 && trend.positive === undefined);
  const isDown = trend && trend.value < 0;
  const isFlat = !trend || trend.value === 0;

  return (
    <div
      className={cn(
        'rounded-card border border-border bg-card p-4 shadow-card transition-shadow hover:shadow-card-hover',
        className,
      )}
    >
      <div className="flex items-center justify-between">
        <div className="text-label-sm font-medium uppercase tracking-wider text-text-secondary">
          {label}
        </div>
        {badge}
      </div>
      <div className="mt-2 flex items-baseline gap-2">
        <span className="text-num-md font-bold leading-none tracking-tight text-text-primary tabular-nums">
          {value}
        </span>
      </div>
      {trend ? (
        <div className="mt-2 flex items-center gap-1 text-label-sm">
          {isUp ? (
            <ArrowUpRight className="h-3.5 w-3.5 text-success" />
          ) : isDown ? (
            <ArrowDownRight className="h-3.5 w-3.5 text-danger" />
          ) : (
            <Minus className="h-3.5 w-3.5 text-text-muted" />
          )}
          <span
            className={cn(
              'font-medium tabular-nums',
              isUp ? 'text-success' : isDown ? 'text-danger' : 'text-text-muted',
            )}
          >
            {trend.value > 0 ? '+' : ''}
            {trend.value.toFixed(1)}% from last month
          </span>
        </div>
      ) : null}
    </div>
  );
}
