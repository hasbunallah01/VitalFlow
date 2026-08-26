'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Lightbulb,
  Wallet,
  History,
  ShieldCheck,
  Settings,
  Sparkles,
} from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { Logo } from '@/components/brand/logo';

const items = [
  { href: '/dashboard', label: 'Overview', icon: LayoutDashboard },
  { href: '/insights', label: 'Insights', icon: Lightbulb },
  { href: '/funding', label: 'Funding', icon: Wallet },
  { href: '/history', label: 'History', icon: History },
  { href: '/audit', label: 'Audit', icon: ShieldCheck },
  { href: '/settings', label: 'Settings', icon: Settings },
];

export function Sidebar({ orgName }: { orgName: string }) {
  const pathname = usePathname();
  return (
    <aside className="hidden w-60 shrink-0 flex-col border-r border-border bg-card md:flex">
      <div className="flex h-16 items-center border-b border-border px-5">
        <Link href="/dashboard" className="flex items-center" aria-label="VitalFlow home">
          <Logo size="md" withWordmark />
        </Link>
      </div>
      <nav className="flex-1 space-y-1 px-3 py-4" aria-label="Primary">
        {items.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + '/');
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2 text-body-sm font-medium transition-colors',
                active
                  ? 'bg-brand/10 text-brand'
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
        <div className="rounded-lg bg-canvas p-3">
          <div className="flex items-center gap-2 text-meta-sm font-medium text-text-primary">
            <Sparkles className="h-3.5 w-3.5 text-brand-teal" />
            {orgName}
          </div>
          <div className="mt-0.5 text-meta-sm text-text-secondary">Dev environment</div>
        </div>
      </div>
    </aside>
  );
}
