/**
 * GET /api/analyses
 *
 * Returns the list of the org's recent analyses (most recent first).
 */

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/client';
import { getOrCreateDevSession } from '@/lib/auth/dev';

export const dynamic = 'force-dynamic';

export async function GET() {
  const session = await getOrCreateDevSession();
  const rows = await prisma.analysis.findMany({
    where: { organizationId: session.organizationId, status: 'completed' },
    orderBy: { completedAt: 'desc' },
    take: 20,
    include: { statement: { select: { filename: true, periodStart: true, periodEnd: true } } },
  });
  return NextResponse.json({
    analyses: rows.map((r) => ({
      id: r.id,
      score: r.score,
      band: r.band,
      completedAt: r.completedAt,
      filename: r.statement.filename,
      periodStart: r.statement.periodStart,
      periodEnd: r.statement.periodEnd,
    })),
  });
}
