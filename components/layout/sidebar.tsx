'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  LineChart,
  Lightbulb,
  Wallet,
  FileText,
  Activity,
  Settings,
  HelpCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { Logo } from '@/components/brand/logo';

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Overview', icon: LayoutDashboard },
  { href: '/analysis', label: 'Analysis', icon: LineChart },
  { href: '/insights', label: 'Insights', icon: Lightbulb },
  { href: '/funding', label: 'Funding', icon: Wallet },
  { href: '/reports', label: 'Reports', icon: FileText },
  { href: '/activity', label: 'Activity', icon: Activity },
];

const UTILITY_ITEMS = [
  { href: '/settings', label: 'Settings', icon: Settings },
  { href: '/help', label: 'Help', icon: HelpCircle },
];

export function Sidebar({ orgName, userName }: { orgName: string; userName: string }) {
  const pathname = usePathname();

  return (
    <aside className="hidden w-60 shrink-0 flex-col border-r border-border bg-card md:flex">
      <div className="flex h-16 items-center border-b border-border px-5">
        <Link href="/dashboard" className="flex items-center" aria-label="VitalFlow home">
          <Logo size="md" withWordmark />
        </Link>
      </div>

      <nav className="flex-1 space-y-0.5 px-3 py-4" aria-label="Primary">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + '/');
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-3 rounded-soft px-3 py-2 text-body-sm font-medium transition-colors',
                active
                  ? 'bg-brand/8 text-brand'
                  : 'text-text-secondary hover:bg-canvas hover:text-text-primary',
              )}
              aria-current={active ? 'page' : undefined}
            >
              <Icon className={cn('h-4 w-4', active ? 'text-brand' : 'text-text-secondary/80')} />
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-border p-3">
        <nav className="space-y-0.5" aria-label="Utility">
          {UTILITY_ITEMS.map(({ href, label, icon: Icon }) => {
            const active = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  'flex items-center gap-3 rounded-soft px-3 py-2 text-body-sm font-medium transition-colors',
                  active
                    ? 'bg-brand/8 text-brand'
                    : 'text-text-secondary hover:bg-canvas hover:text-text-primary',
                )}
              >
                <Icon className="h-4 w-4" />
                {label}
              </Link>
            );
          })}
        </nav>

        <div className="mt-3 rounded-soft border border-border bg-canvas p-2.5">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand text-meta-sm font-semibold text-white">
              {userName?.charAt(0)?.toUpperCase() ?? 'V'}
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-meta-sm font-medium text-text-primary">
                {userName}
              </div>
              <div className="truncate text-meta-sm text-text-secondary">{orgName}</div>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}
