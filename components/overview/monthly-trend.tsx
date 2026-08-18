'use client';

/**
 * Monthly trend chart.
 *
 * Recharts line + bar combo: net flow as a line, balance as bars.
 * No grid lines, no legend (caption does the work). Mobile: vertical.
 */

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
} from 'recharts';
import { formatNumber } from '@/lib/utils';

type Point = {
  yearMonth: string;
  inflow: number;
  outflow: number;
  netFlow: number;
  balanceEnd: number | null;
};

export function MonthlyTrend({
  data,
  currency,
}: {
  data: Point[];
  currency: string;
}) {
  const chartData = data.map((m) => ({
    label: shortMonth(m.yearMonth),
    net: m.netFlow,
    balance: m.balanceEnd ?? 0,
  }));
  return (
    <Card>
      <CardHeader>
        <CardTitle>Monthly cash flow</CardTitle>
        <CardDescription>
          Net cash flow per month (line) and end-of-month balance (bars). All figures in {currency}.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-64 sm:h-72">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
              <XAxis
                dataKey="label"
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 11, fill: '#64748B' }}
                interval="preserveStartEnd"
              />
              <YAxis
                yAxisId="left"
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 11, fill: '#64748B' }}
                width={56}
              />
              <YAxis
                yAxisId="right"
                orientation="right"
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 11, fill: '#64748B' }}
                width={56}
              />
              <Tooltip
                cursor={{ fill: 'rgba(15, 23, 42, 0.04)' }}
                content={<CustomTooltip currency={currency} />}
              />
              <ReferenceLine yAxisId="left" y={0} stroke="#CBD5E1" strokeDasharray="2 2" />
              <Bar
                yAxisId="right"
                dataKey="balance"
                name="Balance"
                fill="#0F766E"
                fillOpacity={0.45}
                radius={[4, 4, 0, 0]}
                maxBarSize={28}
              />
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="net"
                name="Net flow"
                stroke="#0F766E"
                strokeWidth={2.5}
                dot={{ r: 3, fill: '#0F766E', stroke: '#FFFFFF', strokeWidth: 1.5 }}
                activeDot={{ r: 5, fill: '#0F766E', stroke: '#FFFFFF', strokeWidth: 2 }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

function shortMonth(ym: string): string {
  // ym = 'YYYY-MM'
  const [y, m] = ym.split('-');
  const date = new Date(Number(y), Number(m) - 1, 1);
  return date.toLocaleString('en-US', { month: 'short' });
}

function CustomTooltip({
  active,
  payload,
  label,
  currency,
}: {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color: string; dataKey?: string }>;
  label?: string;
  currency: string;
}) {
  if (!active || !payload || payload.length === 0) return null;
  return (
    <div className="rounded-md border border-border bg-white px-3 py-2 text-xs shadow-md">
      <p className="mb-1 font-medium text-ink-900">{label}</p>
      {payload.map((p) => (
        <p key={p.dataKey ?? p.name} className="flex items-center justify-between gap-4 font-tabular" data-numeric>
          <span className="text-ink-500">{p.name}</span>
          <span className="text-ink-900">
            {formatNumber(p.value)} <span className="text-ink-300">{currency}</span>
          </span>
        </p>
      ))}
    </div>
  );
}
