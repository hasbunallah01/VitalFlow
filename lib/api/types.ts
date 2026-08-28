/**
 * VitalFlow — Frontend API types
 *
 * Mirror of the JSON shapes returned by the 10 backend routes. Hand-written
 * (not inferred from Prisma) so the UI depends on the wire contract, not
 * the DB shape. Update here when the API changes.
 */

export type Session = {
  user: { id: string };
  organization: { id: string; name: string };
};

// ----- /api/upload (POST) ---------------------------------------------

export type UploadResponse = {
  analysisId: string;
  score: number;
  band: string;
  statementId: string;
  transactionsParsed: number;
  monthsAnalyzed: number;
  parseErrors: number;
  agents: {
    watcher: AgentRunSummary;
    insight: AgentRunSummary & { recommendationsCreated: number };
    funding: AgentRunSummary & {
      outreachId: string | null;
      eligibleCount: number;
      almostCount: number;
      recommendedProgramId: string | null;
    };
  };
  totalDurationMs?: number;
  orchestratorError?: string | null;
};

export type AgentRunSummary = {
  ran: boolean;
  status: string;
  model: string | null;
  durationMs: number;
};

// ----- /api/analyses (GET) -------------------------------------------

export type AnalysisListItem = {
  id: string;
  score: number | null;
  band: string | null;
  completedAt: string | null;
  filename: string;
  periodStart: string | null;
  periodEnd: string | null;
};

export type AnalysisListResponse = {
  analyses: AnalysisListItem[];
};

// ----- /api/analyses/[id] (GET) --------------------------------------

export type PillarMetric = {
  id: string;
  label: string;
  value: number;
  contribution: number;
};

export type Pillar = {
  id: string;
  label: string;
  maxPoints: number;
  points: number;
  metrics: PillarMetric[];
};

export type Anomaly = {
  kind: string;
  description: string;
  date?: string;
  confidence?: number;
};

export type MonthlyPoint = {
  yearMonth: string;
  monthStart: string;
  inflow: number;
  outflow: number;
  netFlow: number;
  balanceEnd: number | null;
  overdraftDays: number;
};

export type OverviewData = {
  id: string;
  score: number;
  band: string;
  currency: string;
  periodStart: string | null;
  periodEnd: string | null;
  monthsAnalyzed: number;
  confidence: number;
  pillars: Pillar[];
  anomalies: {
    returnedPayments?: number;
    overdraftDays?: number;
    largeUnexplainedOutflows?: number;
    structuralBreaks?: number;
    rapidDeteriorationDetected?: boolean;
    details?: Anomaly[];
  };
  monthly: MonthlyPoint[];
  filename: string;
};

// ----- /api/agents/run (POST) ----------------------------------------

export type AgentsRunResponse = {
  analysisId: string;
  watcher: { ran: boolean; eventsCreated: number; status: string };
  insight: { ran: boolean; recommendationsCreated: number; status: string };
  funding: {
    ran: boolean;
    outreachId: string | null;
    eligibleCount: number;
    almostCount: number;
    recommendedProgramId: string | null;
    status: string;
  };
  totalDurationMs: number;
};

// ----- /api/audit (GET) ----------------------------------------------

export type AgentRun = {
  id: string;
  analysisId: string;
  analysisScore: number | null;
  analysisBand: string | null;
  agent: string;
  agentVersion: string;
  model: string | null;
  promptId: string | null;
  inputHash: string;
  status: string;
  tokensIn: number | null;
  tokensOut: number | null;
  durationMs: number;
  warnings: unknown;
  startedAt: string;
  finishedAt: string | null;
};

export type WatchEvent = {
  id: string;
  analysisId: string | null;
  eventType: string;
  summary: string;
  evidence: unknown;
  notifiedAt: string | null;
  notificationChannel: string | null;
  createdAt: string;
};

export type Recommendation = {
  id: string;
  analysisId: string;
  action: string;
  rationale: string;
  priority: number;
  effort: string;
  pillar: string | null;
  estimatedPointGain: number | null;
  timeframe: string;
};

export type ReadinessGap = {
  programId: string;
  programName: string;
  institution: string;
  status: 'eligible' | 'almost' | 'gap_small' | 'gap_medium' | 'gap_large' | 'blocked';
  totalPointsShort: number;
  primaryGapPillar: string | null;
  /** @deprecated actual field is blockerReason */
  blockers?: string[];
  blockerReason?: string | null;
  pillarGaps?: Array<{ gap: number; pillar: string; currentScore: number; requiredScore: number }>;
  estimatedMonthsToEligibility: number | null;
  advice?: string | null;
  eligible: boolean;
};

export type FundingOutreachAudit = {
  id: string;
  analysisId: string;
  status: string;
  eligibleCount: number;
  almostCount: number;
  programNames: string[];
  planHeadline: string | null;
  planSummary: string | null;
  recommendedProgram: string | null;
  readinessGap: ReadinessGap[] | null;
  viewCount: number;
  firstViewedAt: string | null;
  lastViewedAt: string | null;
  approvedAt: string | null;
  draftedByModel: string | null;
  draftedAt: string;
  shareLink: {
    token: string;
    expiresAt: string;
    accessCount: number;
    revokedAt: string | null;
  } | null;
};

export type AuditResponse = {
  agentRuns?: AgentRun[];
  watchEvents?: WatchEvent[];
  recommendations?: Recommendation[];
  fundingOutreach?: FundingOutreachAudit[];
  analyses?: AnalysisListItem[];
};

// ----- /api/funding-outreach (GET) -----------------------------------

export type FundingProgram = {
  programId: string;
  programName: string;
  institution: string;
  eligible: boolean;
  ruleMissed: string[];
};

export type FundingOutreachDetail = FundingOutreachAudit & {
  eligiblePrograms: FundingProgram[];
  plan: {
    headline: string;
    summary: string;
    recommendedProgram: string | null;
    nextSteps: string[];
  };
  evidencePack: unknown;
};

export type FundingOutreachListResponse = {
  fundingOutreach: FundingOutreachAudit[];
};
