/**
 * Anomalies panel. Empty state if the analysis has none.
 * Surfaces details (NSF, structural breaks, balance anomalies) so
 * the user can act on them. No LLM prose here — the deterministic
 * detector wrote the descriptions.
 */

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

type AnomalyDetail = {
  kind: string;
  description: string;
  date?: string;
  confidence?: number;
};

export function Anomalies({
  summary,
  details,
}: {
  summary: {
    returnedPayments: number;
    overdraftDays: number;
    largeUnexplainedOutflows: number;
    structuralBreaks: number;
    rapidDeteriorationDetected: boolean;
  };
  details: AnomalyDetail[];
}) {
  const total = summary.returnedPayments + summary.overdraftDays
    + summary.largeUnexplainedOutflows + summary.structuralBreaks
    + (summary.rapidDeteriorationDetected ? 1 : 0);
  const clean = total === 0;
  return (
    <Card>
      <CardHeader>
        <div className="flex items-baseline justify-between gap-3">
          <CardTitle>Anomalies</CardTitle>
          <Badge tone={clean ? 'positive' : 'warning'}>
            {clean ? 'No issues detected' : `${total} flagged`}
          </Badge>
        </div>
        <CardDescription>
          Things the deterministic detector flagged in the period.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {clean ? (
          <p className="text-sm text-ink-500">
            No NSF fees, no overdraft days, no balance anomalies, no structural
            breaks. That's a clean period.
          </p>
        ) : (
          <ul className="divide-y divide-border">
            {summary.returnedPayments > 0 && (
              <SummaryRow
                label="NSF / returned item fees"
                value={summary.returnedPayments}
              />
            )}
            {summary.overdraftDays > 0 && (
              <SummaryRow label="Overdraft days" value={summary.overdraftDays} />
            )}
            {summary.largeUnexplainedOutflows > 0 && (
              <SummaryRow
                label="Large unexplained outflows"
                value={summary.largeUnexplainedOutflows}
              />
            )}
            {summary.structuralBreaks > 0 && (
              <SummaryRow
                label="Structural breaks"
                value={summary.structuralBreaks}
              />
            )}
            {summary.rapidDeteriorationDetected && (
              <SummaryRow label="Rapid deterioration" value="Yes" />
            )}
            <li className="pt-3">
              <ul className="space-y-2">
                {details.slice(0, 5).map((d, i) => (
                  <li key={i} className="rounded-md bg-ink-900/[0.02] p-3 text-sm">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium text-ink-900">
                        {humanizeKind(d.kind)}
                      </span>
                      {d.date && (
                        <span className="text-xs text-ink-500 font-tabular" data-numeric>
                          {d.date}
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-ink-700">{d.description}</p>
                  </li>
                ))}
              </ul>
            </li>
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

function SummaryRow({ label, value }: { label: string; value: number | string }) {
  return (
    <li className="flex items-center justify-between py-3 text-sm">
      <span className="text-ink-700">{label}</span>
      <span className="font-tabular text-ink-900" data-numeric>
        {value}
      </span>
    </li>
  );
}

function humanizeKind(k: string): string {
  return k.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

// Suppress unused-import warning on `cn` for tree-shakers
void cn;
