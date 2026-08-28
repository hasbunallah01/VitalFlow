'use client';

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import type { MonthlyPoint } from '@/lib/api/types';
import { formatCurrency } from '@/lib/utils/format';

interface TrendChartProps {
  data: MonthlyPoint[];
  currency: string;
  series?: Array<'inflow' | 'outflow' | 'netFlow'>;
  height?: number;
}

const SERIES_LABELS: Record<string, string> = {
  inflow: 'Revenue',
  outflow: 'Expenses',
  netFlow: 'Net Cash Flow',
};

const SERIES_COLORS: Record<string, string> = {
  inflow: '#1268E8',
  outflow: '#35CFA5',
  netFlow: '#0B1F3A',
};

export function TrendChart({ data, currency, series = ['inflow', 'outflow', 'netFlow'], height = 280 }: TrendChartProps) {
  const chart = data.map((d) => ({
    month: d.yearMonth,
    label: formatMonth(d.yearMonth),
    inflow: d.inflow,
    outflow: d.outflow,
    netFlow: d.netFlow,
  }));
  return (
    <div style={{ height }} className="w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chart} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="0" vertical={false} stroke="#F2F4F7" />
          <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={12} />
          <YAxis
            tickFormatter={(v) => formatCurrency(v, currency, { compact: true })}
            tickLine={false}
            axisLine={false}
            fontSize={12}
            width={56}
          />
          <Tooltip cursor={{ stroke: '#D0D5DD', strokeWidth: 1 }} content={<TooltipEl currency={currency} />} />
          <Legend
            iconType="circle"
            wrapperStyle={{ fontSize: 12, paddingTop: 8 }}
            formatter={(v: string) => <span className="text-label text-text-secondary">{v}</span>}
          />
          {series.map((s) => (
            <Line
              key={s}
              type="monotone"
              dataKey={s}
              name={SERIES_LABELS[s]}
              stroke={SERIES_COLORS[s]}
              strokeWidth={2.5}
              dot={false}
              activeDot={{ r: 5, strokeWidth: 0 }}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

function formatMonth(ym: string): string {
  const [y, m] = ym.split('-');
  const date = new Date(Number(y), Number(m) - 1, 1);
  return date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
}

function TooltipEl({
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
    <div className="rounded-soft border border-border bg-card p-3 shadow-pop">
      <div className="text-label-sm font-semibold text-text-primary">{d.label}</div>
      <dl className="mt-2 space-y-1 text-label-sm">
        <div className="flex items-center justify-between gap-6">
          <dt className="flex items-center gap-1.5 text-text-secondary">
            <span className="h-2 w-2 rounded-full" style={{ background: SERIES_COLORS.inflow }} />
            Revenue
          </dt>
          <dd className="tabular-nums font-medium text-text-primary">
            {formatCurrency(d.inflow, currency)}
          </dd>
        </div>
        <div className="flex items-center justify-between gap-6">
          <dt className="flex items-center gap-1.5 text-text-secondary">
            <span className="h-2 w-2 rounded-full" style={{ background: SERIES_COLORS.outflow }} />
            Expenses
          </dt>
          <dd className="tabular-nums font-medium text-text-primary">
            {formatCurrency(d.outflow, currency)}
          </dd>
        </div>
        <div className="flex items-center justify-between gap-6 border-t border-border pt-1">
          <dt className="text-text-secondary">Net</dt>
          <dd
            className={`tabular-nums font-semibold ${d.netFlow >= 0 ? 'text-success' : 'text-danger'}`}
          >
            {formatCurrency(d.netFlow, currency, { sign: true })}
          </dd>
        </div>
      </dl>
    </div>
  );
}
