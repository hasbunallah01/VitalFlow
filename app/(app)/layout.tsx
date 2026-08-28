import { AppSidebar } from '@/components/layout/sidebar';
import { MobileNav } from '@/components/layout/mobile-nav';
import { getSession } from '@/lib/api/client';

/**
 * (app) layout — wraps all authenticated app pages with the sidebar
 * and the mobile bottom nav. Server component. Calls /api/dev/session
 * to ensure a dev session exists and to read the org/user name.
 */
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  let orgName = 'Your Business';
  let userName = 'Demo Owner';
  try {
    const session = await getSession();
    orgName = session.organization.name;
    userName = 'Demo Owner';
  } catch {
    // Dev session bootstrap is idempotent; should never fail.
  }
  const userInitial = userName.charAt(0).toUpperCase() || 'V';

  return (
    <div className="flex min-h-screen">
      <AppSidebar orgName={orgName} userName={userName} userInitial={userInitial} />
      <div className="flex min-h-screen flex-1 flex-col">
        <main className="flex-1 px-4 pb-24 pt-6 md:px-8 md:pb-10 md:pt-8">
          <div className="mx-auto w-full max-w-[1140px]">{children}</div>
        </main>
        <MobileNav />
      </div>
    </div>
  );
}
