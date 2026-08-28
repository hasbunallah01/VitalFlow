'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Home,
  LineChart,
  Lightbulb,
  Wallet,
  History,
  User,
  Settings as SettingsIcon,
  LogOut,
} from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { Logo } from '@/components/brand/logo';

const NAV_ITEMS = [
  { href: '/home', label: 'Home', icon: Home },
  { href: '/analysis', label: 'Analysis', icon: LineChart },
  { href: '/insights', label: 'Insights', icon: Lightbulb },
  { href: '/funding', label: 'Funding', icon: Wallet },
  { href: '/history', label: 'History', icon: History },
  { href: '/profile', label: 'Profile', icon: User },
  { href: '/settings', label: 'Settings', icon: SettingsIcon },
];

export function AppSidebar({
  orgName,
  userName,
  userInitial,
}: {
  orgName: string;
  userName: string;
  userInitial: string;
}) {
  const pathname = usePathname();
  return (
    <aside className="hidden w-60 shrink-0 flex-col border-r border-border bg-card md:flex">
      {/* Brand */}
      <div className="flex h-16 items-center px-5">
        <Link href="/home" className="flex items-center" aria-label="VitalFlow home">
          <Logo size="md" withWordmark />
        </Link>
      </div>

      {/* Primary nav */}
      <nav className="flex-1 space-y-0.5 px-3 py-3" aria-label="Primary">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + '/');
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? 'page' : undefined}
              className={cn(
                'flex items-center gap-3 rounded-soft px-3 py-2.5 text-body-sm font-medium transition-colors',
                active
                  ? 'bg-brand/10 text-brand'
                  : 'text-text-secondary hover:bg-canvas hover:text-text-primary',
              )}
            >
              <Icon
                className={cn(
                  'h-[18px] w-[18px] shrink-0',
                  active ? 'text-brand' : 'text-text-secondary',
                )}
              />
              {label}
            </Link>
          );
        })}
      </nav>

      {/* Logout */}
      <div className="border-t border-border px-3 py-3">
        <button
          type="button"
          className="flex w-full items-center gap-3 rounded-soft px-3 py-2.5 text-body-sm font-medium text-danger transition-colors hover:bg-danger-muted"
        >
          <LogOut className="h-[18px] w-[18px] shrink-0" />
          Logout
        </button>
      </div>

      {/* Profile card */}
      <div className="border-t border-border p-3">
        <Link
          href="/profile"
          className="flex items-center gap-3 rounded-soft p-2 transition-colors hover:bg-canvas"
        >
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand text-body-sm font-semibold text-white">
            {userInitial}
          </span>
          <div className="min-w-0 flex-1">
            <div className="truncate text-label font-semibold text-text-primary">
              {userName}
            </div>
            <div className="truncate text-label-sm text-text-secondary">{orgName}</div>
          </div>
        </Link>
      </div>
    </aside>
  );
}
