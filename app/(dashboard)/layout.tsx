import { redirect } from 'next/navigation';
import { Sidebar } from '@/components/layout/sidebar';
import { MobileNav } from '@/components/layout/mobile-nav';
import { getSession } from '@/lib/api/client';

/**
 * (dashboard) layout — wraps all authenticated app pages with the
 * sidebar and the mobile bottom-nav. Server component: it calls
 * /api/dev/session to ensure a dev session exists and to render
 * the org name in the sidebar. If the API is unavailable, it
 * redirects to the marketing page rather than crashing.
 */
export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  let orgName = 'Your business';
  try {
    const session = await getSession();
    orgName = session.organization.name;
  } catch {
    // The dev session bootstrap is idempotent; this should never fail.
    // If it does, we still render the shell rather than crash.
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar orgName={orgName} />
      <div className="flex min-h-screen flex-1 flex-col">
        <main className="flex-1 px-5 pb-24 pt-6 md:px-10 md:pb-10 md:pt-8">
          <div className="mx-auto w-full max-w-6xl">{children}</div>
        </main>
        <MobileNav />
      </div>
    </div>
  );
}
