/**
 * Dashboard page — the Overview tab.
 *
 * Server component: queries the DB for the dev org's latest completed
 * analysis. If none, shows the empty state.
 */

import { getOrCreateDevSession } from '@/lib/auth/dev';
import { loadLatestOverview } from '@/lib/db/load-overview';
import { OverviewView, OverviewEmptyState } from '@/components/overview/view';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const session = await getOrCreateDevSession();
  const data = await loadLatestOverview(session.organizationId);
  if (!data) return <OverviewEmptyState />;
  return <OverviewView data={data} title="Overview" />;
}
