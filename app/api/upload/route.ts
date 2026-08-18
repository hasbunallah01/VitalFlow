/**
 * POST /api/upload
 *
 * Accepts a multipart/form-data upload (field name: `file`),
 * parses the CSV using the EXISTING lib/csv/parser (no business
 * logic changed), aggregates with the EXISTING lib/csv/aggregate,
 * and persists via the EXISTING lib/db/persist.persistFullPipeline.
 *
 * Returns the resulting analysisId. The UI then redirects to
 * /analysis/[id] which calls /api/analyses/[id] for the dashboard.
 */

import { NextResponse } from 'next/server';
import { parseStatement } from '@/lib/csv/parser';
import { aggregateByMonth } from '@/lib/csv/aggregate';
import { persistFullPipeline } from '@/lib/db/persist';
import { prisma } from '@/lib/db/client';
import { getOrCreateDevSession } from '@/lib/auth/dev';

export const dynamic = 'force-dynamic';
// Allow long parsing of large CSVs. Next.js server actions already
// support up to 10 MB; this route uses the standard fetch handler.
export const maxDuration = 60;

export async function POST(req: Request) {
  const form = await req.formData();
  const file = form.get('file');
  if (!(file instanceof File)) {
    return NextResponse.json(
      { error: 'No file uploaded. Expected a multipart form with field "file".' },
      { status: 400 },
    );
  }
  const csvText = await file.text();
  if (csvText.length === 0) {
    return NextResponse.json({ error: 'Empty file.' }, { status: 400 });
  }
  const session = await getOrCreateDevSession();
  const { statement, errors } = parseStatement(csvText, {
    organizationId: session.organizationId,
    accountId: 'acc-dev-default',
    currency: 'XCD',
    filename: file.name,
  });
  if (errors.length > 0 && statement.transactions.length === 0) {
    return NextResponse.json(
      { error: 'No transactions could be parsed.', parseErrors: errors.slice(0, 5) },
      { status: 400 },
    );
  }
  const agg = aggregateByMonth(statement);
  const result = await persistFullPipeline(prisma, {
    organizationId: session.organizationId,
    statement,
    fileRef: `dev-uploads/${file.name}`,
    sizeBytes: csvText.length,
    monthly: agg.monthly,
    returnedPayments: agg.returnedPayments,
    loanPaymentTotal: agg.loanPaymentTotal,
  });
  return NextResponse.json({
    analysisId: result.analysisId,
    score: result.score,
    band: result.band,
    statementId: result.statementId,
    transactionsParsed: statement.transactions.length,
    monthsAnalyzed: agg.monthly.length,
    parseErrors: errors.length,
  });
}
