-- CreateEnum
CREATE TYPE "StatementStatus" AS ENUM ('uploaded', 'validating', 'validated', 'rejected');

-- CreateEnum
CREATE TYPE "AnalysisStatus" AS ENUM ('queued', 'validating', 'awaiting_input', 'analyzing', 'scoring', 'interpreting', 'reporting', 'completed', 'degraded', 'failed', 'validation_failed');

-- CreateEnum
CREATE TYPE "Direction" AS ENUM ('inflow', 'outflow');

-- CreateEnum
CREATE TYPE "CategorySource" AS ENUM ('rule', 'llm', 'user');

-- CreateEnum
CREATE TYPE "CounterpartyType" AS ENUM ('customer', 'supplier', 'employee', 'institution', 'internal', 'unknown');

-- CreateEnum
CREATE TYPE "Cadence" AS ENUM ('weekly', 'biweekly', 'monthly', 'quarterly', 'irregular');

-- CreateEnum
CREATE TYPE "HealthBand" AS ENUM ('Critical', 'Fragile', 'Watch', 'Healthy', 'Strong');

-- CreateEnum
CREATE TYPE "FundingTier" AS ENUM ('NotReady', 'Building', 'NearReady', 'Ready');

-- CreateEnum
CREATE TYPE "RunStatus" AS ENUM ('completed', 'failed', 'skipped', 'degraded');

-- CreateEnum
CREATE TYPE "Severity" AS ENUM ('info', 'watch', 'concern', 'critical');

-- CreateEnum
CREATE TYPE "Effort" AS ENUM ('low', 'medium', 'high');

-- CreateEnum
CREATE TYPE "ActorType" AS ENUM ('user', 'partner', 'system');

-- CreateEnum
CREATE TYPE "MembershipRole" AS ENUM ('owner', 'admin', 'member', 'viewer');

-- CreateEnum
CREATE TYPE "FundingOutreachStatus" AS ENUM ('drafted', 'approved', 'shared', 'viewed', 'completed', 'revoked', 'failed');

-- CreateEnum
CREATE TYPE "WatchEventType" AS ENUM ('score_drop', 'score_rise', 'risk_flag_new', 'threshold_crossed', 'balance_anomaly', 'recurring_broken', 'funding_tier_change');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "emailVerified" TIMESTAMP(3),
    "image" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Account" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "sessionToken" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Membership" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "role" "MembershipRole" NOT NULL DEFAULT 'owner',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Membership_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Organization" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "country" TEXT,
    "defaultCurrency" TEXT NOT NULL,
    "sector" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Organization_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Statement" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "fileRef" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "checksum" TEXT NOT NULL,
    "status" "StatementStatus" NOT NULL DEFAULT 'uploaded',
    "currency" TEXT,
    "periodStart" TIMESTAMP(3),
    "periodEnd" TIMESTAMP(3),
    "columnMapping" JSONB,
    "hasBalanceColumn" BOOLEAN NOT NULL DEFAULT false,
    "qualityReport" JSONB,
    "retentionExpiresAt" TIMESTAMP(3),
    "supersedesId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Statement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Transaction" (
    "id" TEXT NOT NULL,
    "statementId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "description" TEXT NOT NULL,
    "normalizedDescription" TEXT NOT NULL,
    "amountMinor" BIGINT NOT NULL,
    "currency" TEXT NOT NULL,
    "balanceMinor" BIGINT,
    "direction" "Direction" NOT NULL,
    "category" TEXT,
    "categorySource" "CategorySource",
    "counterpartyId" TEXT,
    "isTransfer" BOOLEAN NOT NULL DEFAULT false,
    "isRecurring" BOOLEAN NOT NULL DEFAULT false,
    "recurringSeriesId" TEXT,
    "rowNumber" INTEGER NOT NULL,

    CONSTRAINT "Transaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Counterparty" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "normalizedKey" TEXT NOT NULL,
    "type" "CounterpartyType" NOT NULL DEFAULT 'unknown',
    "totalInflowMinor" BIGINT NOT NULL DEFAULT 0,
    "totalOutflowMinor" BIGINT NOT NULL DEFAULT 0,
    "transactionCount" INTEGER NOT NULL DEFAULT 0,
    "firstSeen" DATE,
    "lastSeen" DATE,

    CONSTRAINT "Counterparty_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RecurringSeries" (
    "id" TEXT NOT NULL,
    "analysisId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "direction" "Direction" NOT NULL,
    "cadence" "Cadence" NOT NULL,
    "medianAmountMinor" BIGINT NOT NULL,
    "amountVariance" DOUBLE PRECISION NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isFixedObligation" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "RecurringSeries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Analysis" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "statementId" TEXT NOT NULL,
    "status" "AnalysisStatus" NOT NULL DEFAULT 'queued',
    "stage" TEXT,
    "progressPercent" INTEGER NOT NULL DEFAULT 0,
    "score" INTEGER,
    "band" "HealthBand",
    "pillars" JSONB,
    "confidence" DOUBLE PRECISION,
    "fundingTier" "FundingTier",
    "scoringVersion" TEXT NOT NULL DEFAULT 'scoring@0.1.0',
    "degraded" BOOLEAN NOT NULL DEFAULT false,
    "failureCode" TEXT,
    "failureMessage" TEXT,
    "totalTokens" INTEGER NOT NULL DEFAULT 0,
    "estimatedCostMicros" BIGINT NOT NULL DEFAULT 0,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Analysis_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AgentRun" (
    "id" TEXT NOT NULL,
    "analysisId" TEXT NOT NULL,
    "agent" TEXT NOT NULL,
    "agentVersion" TEXT NOT NULL,
    "promptId" TEXT,
    "model" TEXT,
    "inputHash" TEXT NOT NULL,
    "output" JSONB,
    "status" "RunStatus" NOT NULL,
    "warnings" JSONB NOT NULL DEFAULT '[]',
    "tokensIn" INTEGER,
    "tokensOut" INTEGER,
    "durationMs" INTEGER NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL,
    "finishedAt" TIMESTAMP(3),

    CONSTRAINT "AgentRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Metric" (
    "id" TEXT NOT NULL,
    "analysisId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" DOUBLE PRECISION NOT NULL,
    "unit" TEXT NOT NULL,
    "currency" TEXT,
    "pillar" TEXT,
    "confidence" DOUBLE PRECISION NOT NULL DEFAULT 1,

    CONSTRAINT "Metric_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Insight" (
    "id" TEXT NOT NULL,
    "analysisId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "explanation" TEXT NOT NULL,
    "severity" "Severity" NOT NULL,
    "sourceMetrics" TEXT[],
    "evidenceTransactionIds" TEXT[],
    "displayOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "Insight_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Recommendation" (
    "id" TEXT NOT NULL,
    "analysisId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "rationale" TEXT NOT NULL,
    "priority" INTEGER NOT NULL,
    "effort" "Effort" NOT NULL,
    "pillar" TEXT,
    "estimatedPointGain" DOUBLE PRECISION,
    "timeframe" TEXT NOT NULL,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "Recommendation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RiskFlag" (
    "id" TEXT NOT NULL,
    "analysisId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "severity" "Severity" NOT NULL,
    "detail" TEXT NOT NULL,
    "pointsDeducted" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "evidenceTransactionIds" TEXT[],

    CONSTRAINT "RiskFlag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Report" (
    "id" TEXT NOT NULL,
    "analysisId" TEXT NOT NULL,
    "pdfRef" TEXT NOT NULL,
    "model" JSONB NOT NULL,
    "pages" INTEGER NOT NULL,
    "disclaimerVersion" TEXT NOT NULL,
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Report_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FundingOutreach" (
    "id" TEXT NOT NULL,
    "analysisId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "status" "FundingOutreachStatus" NOT NULL DEFAULT 'drafted',
    "eligiblePrograms" JSONB NOT NULL,
    "plan" JSONB NOT NULL,
    "evidencePack" JSONB NOT NULL,
    "approvedAt" TIMESTAMP(3),
    "approvedByUserId" TEXT,
    "shareLinkId" TEXT,
    "firstViewedAt" TIMESTAMP(3),
    "viewCount" INTEGER NOT NULL DEFAULT 0,
    "lastViewedAt" TIMESTAMP(3),
    "draftedByModel" TEXT,
    "draftedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FundingOutreach_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WatchEvent" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "analysisId" TEXT,
    "eventType" "WatchEventType" NOT NULL,
    "summary" TEXT NOT NULL,
    "evidence" JSONB NOT NULL,
    "notifiedAt" TIMESTAMP(3),
    "notificationChannel" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WatchEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DeltaRecord" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "currentAnalysisId" TEXT NOT NULL,
    "previousAnalysisId" TEXT NOT NULL,
    "scoreDelta" INTEGER NOT NULL,
    "bandChanged" BOOLEAN NOT NULL,
    "previousBand" "HealthBand",
    "currentBand" "HealthBand",
    "pillarDeltas" JSONB NOT NULL,
    "summary" TEXT NOT NULL,
    "evidence" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DeltaRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShareLink" (
    "id" TEXT NOT NULL,
    "reportId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "accessCount" INTEGER NOT NULL DEFAULT 0,
    "lastAccessedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ShareLink_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "actorType" "ActorType" NOT NULL,
    "actorId" TEXT,
    "action" TEXT NOT NULL,
    "resourceType" TEXT NOT NULL,
    "resourceId" TEXT,
    "ipHash" TEXT,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Account_provider_providerAccountId_key" ON "Account"("provider", "providerAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "Session_sessionToken_key" ON "Session"("sessionToken");

-- CreateIndex
CREATE UNIQUE INDEX "Membership_userId_organizationId_key" ON "Membership"("userId", "organizationId");

-- CreateIndex
CREATE INDEX "Statement_organizationId_createdAt_idx" ON "Statement"("organizationId", "createdAt");

-- CreateIndex
CREATE INDEX "Statement_checksum_idx" ON "Statement"("checksum");

-- CreateIndex
CREATE INDEX "Transaction_organizationId_date_idx" ON "Transaction"("organizationId", "date");

-- CreateIndex
CREATE INDEX "Transaction_statementId_date_idx" ON "Transaction"("statementId", "date");

-- CreateIndex
CREATE INDEX "Transaction_counterpartyId_idx" ON "Transaction"("counterpartyId");

-- CreateIndex
CREATE INDEX "Transaction_recurringSeriesId_idx" ON "Transaction"("recurringSeriesId");

-- CreateIndex
CREATE UNIQUE INDEX "Counterparty_organizationId_normalizedKey_key" ON "Counterparty"("organizationId", "normalizedKey");

-- CreateIndex
CREATE INDEX "RecurringSeries_analysisId_idx" ON "RecurringSeries"("analysisId");

-- CreateIndex
CREATE INDEX "Analysis_organizationId_createdAt_idx" ON "Analysis"("organizationId", "createdAt");

-- CreateIndex
CREATE INDEX "AgentRun_analysisId_startedAt_idx" ON "AgentRun"("analysisId", "startedAt");

-- CreateIndex
CREATE UNIQUE INDEX "Metric_analysisId_key_key" ON "Metric"("analysisId", "key");

-- CreateIndex
CREATE INDEX "Insight_analysisId_idx" ON "Insight"("analysisId");

-- CreateIndex
CREATE INDEX "Recommendation_analysisId_idx" ON "Recommendation"("analysisId");

-- CreateIndex
CREATE INDEX "RiskFlag_analysisId_idx" ON "RiskFlag"("analysisId");

-- CreateIndex
CREATE UNIQUE INDEX "Report_analysisId_key" ON "Report"("analysisId");

-- CreateIndex
CREATE UNIQUE INDEX "FundingOutreach_shareLinkId_key" ON "FundingOutreach"("shareLinkId");

-- CreateIndex
CREATE INDEX "FundingOutreach_organizationId_status_idx" ON "FundingOutreach"("organizationId", "status");

-- CreateIndex
CREATE INDEX "FundingOutreach_analysisId_idx" ON "FundingOutreach"("analysisId");

-- CreateIndex
CREATE INDEX "WatchEvent_organizationId_createdAt_idx" ON "WatchEvent"("organizationId", "createdAt");

-- CreateIndex
CREATE INDEX "WatchEvent_analysisId_idx" ON "WatchEvent"("analysisId");

-- CreateIndex
CREATE INDEX "DeltaRecord_organizationId_createdAt_idx" ON "DeltaRecord"("organizationId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "ShareLink_token_key" ON "ShareLink"("token");

-- CreateIndex
CREATE INDEX "AuditLog_organizationId_occurredAt_idx" ON "AuditLog"("organizationId", "occurredAt");

-- AddForeignKey
ALTER TABLE "Account" ADD CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Membership" ADD CONSTRAINT "Membership_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Membership" ADD CONSTRAINT "Membership_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Statement" ADD CONSTRAINT "Statement_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_statementId_fkey" FOREIGN KEY ("statementId") REFERENCES "Statement"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_counterpartyId_fkey" FOREIGN KEY ("counterpartyId") REFERENCES "Counterparty"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_recurringSeriesId_fkey" FOREIGN KEY ("recurringSeriesId") REFERENCES "RecurringSeries"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecurringSeries" ADD CONSTRAINT "RecurringSeries_analysisId_fkey" FOREIGN KEY ("analysisId") REFERENCES "Analysis"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Analysis" ADD CONSTRAINT "Analysis_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Analysis" ADD CONSTRAINT "Analysis_statementId_fkey" FOREIGN KEY ("statementId") REFERENCES "Statement"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgentRun" ADD CONSTRAINT "AgentRun_analysisId_fkey" FOREIGN KEY ("analysisId") REFERENCES "Analysis"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Metric" ADD CONSTRAINT "Metric_analysisId_fkey" FOREIGN KEY ("analysisId") REFERENCES "Analysis"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Insight" ADD CONSTRAINT "Insight_analysisId_fkey" FOREIGN KEY ("analysisId") REFERENCES "Analysis"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Recommendation" ADD CONSTRAINT "Recommendation_analysisId_fkey" FOREIGN KEY ("analysisId") REFERENCES "Analysis"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RiskFlag" ADD CONSTRAINT "RiskFlag_analysisId_fkey" FOREIGN KEY ("analysisId") REFERENCES "Analysis"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Report" ADD CONSTRAINT "Report_analysisId_fkey" FOREIGN KEY ("analysisId") REFERENCES "Analysis"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FundingOutreach" ADD CONSTRAINT "FundingOutreach_analysisId_fkey" FOREIGN KEY ("analysisId") REFERENCES "Analysis"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WatchEvent" ADD CONSTRAINT "WatchEvent_analysisId_fkey" FOREIGN KEY ("analysisId") REFERENCES "Analysis"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeltaRecord" ADD CONSTRAINT "DeltaRecord_currentAnalysisId_fkey" FOREIGN KEY ("currentAnalysisId") REFERENCES "Analysis"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeltaRecord" ADD CONSTRAINT "DeltaRecord_previousAnalysisId_fkey" FOREIGN KEY ("previousAnalysisId") REFERENCES "Analysis"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShareLink" ADD CONSTRAINT "ShareLink_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "Report"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
