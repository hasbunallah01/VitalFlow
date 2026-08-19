/**
 * OverviewData — the JSON shape returned to the UI / API consumers.
 *
 * Lives in lib/ (not components/) so server-side loaders can import
 * it without dragging the UI tree into the build.
 */

export type OverviewData = {
  id: string;
  score: number;
  band: string;
  currency: string;
  periodStart: string | null;
  periodEnd: string | null;
  monthsAnalyzed: number;
  confidence: number;
  pillars: Array<{
    id: string;
    label: string;
    maxPoints: number;
    points: number;
    metrics: Array<{ id: string; label: string; value: number; contribution: number }>;
  }>;
  anomalies: {
    returnedPayments?: number;
    overdraftDays?: number;
    largeUnexplainedOutflows?: number;
    structuralBreaks?: number;
    rapidDeteriorationDetected?: boolean;
    details?: Array<{ kind: string; description: string; date?: string; confidence?: number }>;
  };
  monthly: Array<{
    yearMonth: string;
    monthStart: string;
    inflow: number;
    outflow: number;
    netFlow: number;
    balanceEnd: number | null;
    overdraftDays: number;
  }>;
  filename: string;
};
