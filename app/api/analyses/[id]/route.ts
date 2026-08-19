/**
 * GET /api/analyses/[id]
 *
 * Returns the full analysis overview (pillars, anomalies, monthly).
 */

import { NextResponse } from 'next/server';
import { getOrCreateDevSession } from '@/lib/auth/dev';
import { loadOverviewByAnalysisId } from '@/lib/db/load-overview';

export const dynamic = 'force-dynamic';

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getOrCreateDevSession();
  const data = await loadOverviewByAnalysisId(session.organizationId, id);
  if (!data) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(data);
}
