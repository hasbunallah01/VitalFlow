/**
 * /analysis/[id] — view a specific analysis. The redirect target
 * after upload. Same rendering as /dashboard, just pinned to one id.
 */

import { notFound } from 'next/navigation';
import { getOrCreateDevSession } from '@/lib/auth/dev';
import { loadOverviewByAnalysisId } from '@/lib/db/load-overview';
import { OverviewView } from '@/components/overview/view';

export const dynamic = 'force-dynamic';

export default async function AnalysisPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getOrCreateDevSession();
  const data = await loadOverviewByAnalysisId(session.organizationId, id);
  if (!data) notFound();
  return <OverviewView data={data} title="Overview" />;
}
