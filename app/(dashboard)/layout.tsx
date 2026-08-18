/**
 * Dashboard layout — the shell every dashboard page sits inside.
 *
 * Server component: reads the dev session and passes the org name
 * to the client nav. No auth (per Checkpoint 6A scope).
 *
 * Mobile-first: mobile gets a top header + content + bottom tab bar.
 * Desktop (md+): a side rail replaces the bottom tab bar; the
 * main content shifts right.
 */

import { getOrCreateDevSession } from '@/lib/auth/dev';
import { DashboardNav, MobileHeader } from '@/components/dashboard/nav';

export const dynamic = 'force-dynamic';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getOrCreateDevSession();
  return (
    <div className="min-h-screen bg-page text-ink-900">
      <MobileHeader orgName={session.organizationName} />
      <DashboardNav orgName={session.organizationName} />
      <main className="md:pl-60">
        <div className="mx-auto max-w-5xl px-4 py-6 pb-24 sm:px-6 sm:py-8 md:pb-10">
          {children}
        </div>
      </main>
    </div>
  );
}
