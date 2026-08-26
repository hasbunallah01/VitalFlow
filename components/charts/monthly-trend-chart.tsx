'use client';

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import type { MonthlyPoint } from '@/lib/api/types';
import { formatCurrency } from '@/lib/utils/format';

interface MonthlyTrendChartProps {
  data: MonthlyPoint[];
  currency: string;
}

export function MonthlyTrendChart({ data, currency }: MonthlyTrendChartProps) {
  const chart = data.map((d) => ({
    month: d.yearMonth.slice(2), // "2401" -> "2401"
    label: formatMonth(d.yearMonth),
    inflow: d.inflow,
    outflow: d.outflow, // already positive in API
    netFlow: d.netFlow,
  }));
  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chart} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="grad-inflow" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#155EEF" stopOpacity={0.25} />
              <stop offset="95%" stopColor="#155EEF" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="grad-outflow" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#16B8A6" stopOpacity={0.2} />
              <stop offset="95%" stopColor="#16B8A6" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="0" vertical={false} />
          <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={12} />
          <YAxis
            tickFormatter={(v) => formatCurrency(v, currency, { compact: true })}
            tickLine={false}
            axisLine={false}
            fontSize={12}
            width={56}
          />
          <Tooltip
            cursor={{ stroke: '#CBD5E1', strokeWidth: 1 }}
            content={<ChartTooltip currency={currency} />}
          />
          <Legend
            iconType="circle"
            wrapperStyle={{ fontSize: 12, paddingTop: 8 }}
            formatter={(v) => <span className="text-meta text-text-secondary">{v}</span>}
          />
          <Area
            type="monotone"
            dataKey="inflow"
            name="Inflow"
            stroke="#155EEF"
            strokeWidth={2}
            fill="url(#grad-inflow)"
          />
          <Area
            type="monotone"
            dataKey="outflow"
            name="Outflow"
            stroke="#16B8A6"
            strokeWidth={2}
            fill="url(#grad-outflow)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

function formatMonth(ym: string): string {
  // yearMonth format: 2024-01
  const [y, m] = ym.split('-');
  const date = new Date(Number(y), Number(m) - 1, 1);
  return date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
}

function ChartTooltip({
  active,
  payload,
  currency,
}: {
  active?: boolean;
  payload?: Array<{ payload: { label: string; inflow: number; outflow: number; netFlow: number } }>;
  currency: string;
}) {
  if (!active || !payload || !payload.length || !payload[0]) return null;
  const d = payload[0].payload;
  return (
    <div className="rounded-lg border border-border bg-card p-3 shadow-card-hover">
      <div className="text-meta-sm font-medium text-text-primary">{d.label}</div>
      <dl className="mt-2 space-y-1 text-meta-sm">
        <div className="flex items-center justify-between gap-6">
          <dt className="flex items-center gap-1.5 text-text-secondary">
            <span className="h-2 w-2 rounded-full bg-brand" />
            Inflow
          </dt>
          <dd className="tabular-nums font-medium text-text-primary">
            {formatCurrency(d.inflow, currency)}
          </dd>
        </div>
        <div className="flex items-center justify-between gap-6">
          <dt className="flex items-center gap-1.5 text-text-secondary">
            <span className="h-2 w-2 rounded-full bg-brand-teal" />
            Outflow
          </dt>
          <dd className="tabular-nums font-medium text-text-primary">
            {formatCurrency(d.outflow, currency)}
          </dd>
        </div>
        <div className="flex items-center justify-between gap-6 border-t border-border pt-1">
          <dt className="text-text-secondary">Net</dt>
          <dd
            className={`tabular-nums font-semibold ${
              d.netFlow >= 0 ? 'text-positive' : 'text-negative'
            }`}
          >
            {formatCurrency(d.netFlow, currency, { sign: true })}
          </dd>
        </div>
      </dl>
    </div>
  );
}
