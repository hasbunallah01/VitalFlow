'use client';

import * as React from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils/cn';

interface TabsContextValue {
  value: string;
}

const TabsContext = React.createContext<TabsContextValue | null>(null);

export interface TabsProps {
  value: string;
  onValueChange?: (value: string) => void;
  children: React.ReactNode;
  className?: string;
}

export function Tabs({ value, children, className }: TabsProps) {
  return (
    <TabsContext.Provider value={{ value }}>
      <div className={className}>{children}</div>
    </TabsContext.Provider>
  );
}

export function TabsList({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        'inline-flex h-10 items-center gap-1 rounded-soft border border-border bg-card p-1 shadow-card',
        className,
      )}
      role="tablist"
    >
      {children}
    </div>
  );
}

export function TabsTrigger({
  value,
  href,
  children,
  className,
}: {
  value: string;
  /** If provided, trigger becomes a Next.js <Link> for SSR-friendly tabs. */
  href?: string;
  children: React.ReactNode;
  className?: string;
}) {
  const ctx = React.useContext(TabsContext);
  if (!ctx) throw new Error('TabsTrigger must be used inside <Tabs>');
  const active = ctx.value === value;
  const classNameResolved = cn(
    'inline-flex h-8 items-center justify-center rounded-md px-3 text-label font-medium transition-colors',
    active
      ? 'bg-brand/10 text-brand'
      : 'text-text-secondary hover:text-text-primary',
    className,
  );
  if (href) {
    return (
      <Link
        href={href}
        role="tab"
        aria-selected={active}
        scroll={false}
        className={classNameResolved}
      >
        {children}
      </Link>
    );
  }
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      data-value={value}
      className={classNameResolved}
    >
      {children}
    </button>
  );
}

export function TabsContent({
  value,
  children,
  className,
}: {
  value: string;
  children: React.ReactNode;
  className?: string;
}) {
  const ctx = React.useContext(TabsContext);
  if (!ctx) throw new Error('TabsContent must be used inside <Tabs>');
  if (ctx.value !== value) return null;
  return <div className={cn('animate-fade-in', className)}>{children}</div>;
}
