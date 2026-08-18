/**
 * GET /api/analyses/[id]
 *
 * Returns the full analysis overview as JSON. The UI prefers the
 * server-component loaders; this route is for client-side fetches
 * (e.g. the funding tab when a user navigates back to an analysis).
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
