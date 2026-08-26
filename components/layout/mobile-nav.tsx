'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Lightbulb,
  Wallet,
  History,
  ShieldCheck,
} from 'lucide-react';
import { cn } from '@/lib/utils/cn';

const items = [
  { href: '/dashboard', label: 'Overview', icon: LayoutDashboard },
  { href: '/insights', label: 'Insights', icon: Lightbulb },
  { href: '/funding', label: 'Funding', icon: Wallet },
  { href: '/history', label: 'History', icon: History },
  { href: '/audit', label: 'Audit', icon: ShieldCheck },
];

export function MobileNav() {
  const pathname = usePathname();
  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card/95 backdrop-blur md:hidden"
      aria-label="Primary"
    >
      <ul className="grid grid-cols-5">
        {items.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + '/');
          return (
            <li key={href}>
              <Link
                href={href}
                className={cn(
                  'flex flex-col items-center gap-0.5 py-2.5 text-meta-sm',
                  active ? 'text-brand' : 'text-text-secondary',
                )}
                aria-current={active ? 'page' : undefined}
              >
                <Icon className="h-4 w-4" />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
