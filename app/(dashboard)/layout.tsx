import { Sidebar } from '@/components/layout/sidebar';
import { MobileNav } from '@/components/layout/mobile-nav';
import { getSession } from '@/lib/api/client';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  let orgName = 'Your business';
  let userName = 'Owner';
  try {
    const session = await getSession();
    orgName = session.organization.name;
    userName = 'Demo owner';
  } catch {
    // Dev session bootstrap is idempotent.
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar orgName={orgName} userName={userName} />
      <div className="flex min-h-screen flex-1 flex-col">
        <main className="flex-1 px-5 pb-24 pt-6 md:px-8 md:pb-10 md:pt-8">
          <div className="mx-auto w-full max-w-6xl">{children}</div>
        </main>
        <MobileNav />
      </div>
    </div>
  );
}
