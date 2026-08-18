'use client';

/**
 * Dashboard navigation.
 *
 * Mobile-first: bottom tab bar (always within thumb reach).
 * Desktop (md+): side rail on the left, top of page is the brand.
 *
 * Three tabs: Overview, Funding, Activity. For 6A, only Overview is
 * wired up; Funding and Activity are visible but disabled with a
 * "coming next" hint. They become real once the user approves 6A.
 */

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

type Tab = {
  href: string;
  label: string;
  icon: React.ReactNode;
  available: boolean;
};

const HomeIcon = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
    <path d="M3 12L12 3l9 9" />
    <path d="M5 10v10h14V10" />
  </svg>
);

const FundingIcon = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
    <path d="M12 2v20" />
    <path d="M17 5H9.5a3.5 3.5 0 1 0 0 7h5a3.5 3.5 0 1 1 0 7H6" />
  </svg>
);

const ActivityIcon = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
    <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
  </svg>
);

const TABS: Tab[] = [
  { href: '/dashboard',  label: 'Overview',  icon: HomeIcon,     available: true },
  { href: '/funding',    label: 'Funding',   icon: FundingIcon,  available: false },
  { href: '/activity',   label: 'Activity',  icon: ActivityIcon, available: false },
];

export function DashboardNav({ orgName }: { orgName: string }) {
  const pathname = usePathname() ?? '';
  return (
    <>
      {/* Mobile: bottom tab bar (fixed) */}
      <nav
        aria-label="Primary"
        className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-white/95 backdrop-blur md:hidden"
      >
        <ul className="grid grid-cols-3">
          {TABS.map((t) => {
            const active = pathname === t.href || pathname.startsWith(t.href + '/');
            return (
              <li key={t.href}>
                <Link
                  href={t.available ? t.href : '#'}
                  aria-disabled={!t.available}
                  aria-current={active ? 'page' : undefined}
                  className={cn(
                    'flex flex-col items-center justify-center gap-1 py-3 text-xs font-medium transition-colors',
                    !t.available && 'cursor-not-allowed text-ink-300',
                    t.available && active && 'text-brand-700',
                    t.available && !active && 'text-ink-500 hover:text-ink-900',
                  )}
                >
                  <span className={active && t.available ? 'text-brand-700' : ''}>{t.icon}</span>
                  <span>{t.label}</span>
                  {!t.available && (
                    <span className="absolute mt-0 text-[9px] uppercase tracking-wider text-ink-300">soon</span>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
        {/* Bottom safe-area spacer so iOS Safari bottom bar doesn't cover tabs */}
        <div className="h-[env(safe-area-inset-bottom)]" />
      </nav>

      {/* Desktop: side rail */}
      <aside
        aria-label="Primary"
        className="hidden md:fixed md:inset-y-0 md:left-0 md:z-30 md:flex md:w-60 md:flex-col md:border-r md:border-border md:bg-white"
      >
        <div className="flex h-16 items-center gap-2 border-b border-border px-5">
          <BrandMark />
          <span className="font-semibold tracking-tight text-ink-900">VitalFlow</span>
        </div>
        <div className="px-3 py-4">
          <p className="px-2 text-[11px] font-medium uppercase tracking-wider text-ink-300">Workspace</p>
          <p className="mt-1 truncate px-2 text-sm font-medium text-ink-700">{orgName}</p>
        </div>
        <nav className="px-3">
          <ul className="space-y-0.5">
            {TABS.map((t) => {
              const active = pathname === t.href || pathname.startsWith(t.href + '/');
              return (
                <li key={t.href}>
                  <Link
                    href={t.available ? t.href : '#'}
                    aria-disabled={!t.available}
                    aria-current={active ? 'page' : undefined}
                    className={cn(
                      'flex items-center justify-between gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                      !t.available && 'cursor-not-allowed text-ink-300',
                      t.available && active && 'bg-brand-50 text-brand-700',
                      t.available && !active && 'text-ink-700 hover:bg-ink-900/5',
                    )}
                  >
                    <span className="flex items-center gap-3">
                      <span className={active && t.available ? 'text-brand-700' : ''}>{t.icon}</span>
                      {t.label}
                    </span>
                    {!t.available && (
                      <span className="text-[10px] uppercase tracking-wider text-ink-300">soon</span>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
        <div className="mt-auto px-5 py-4 text-xs text-ink-300">
          v0.1 · Buildathon demo
        </div>
      </aside>
    </>
  );
}

function BrandMark() {
  return (
    <span className="flex h-8 w-8 items-center justify-center rounded-md bg-brand-700 text-white font-semibold tracking-tight">
      V
    </span>
  );
}

export function MobileHeader({ orgName }: { orgName: string }) {
  return (
    <header className="sticky top-0 z-20 border-b border-border bg-white/95 backdrop-blur md:hidden">
      <div className="flex h-14 items-center gap-2 px-4">
        <BrandMark />
        <span className="font-semibold tracking-tight text-ink-900">VitalFlow</span>
        <span className="ml-auto truncate text-sm text-ink-500">{orgName}</span>
      </div>
    </header>
  );
}
