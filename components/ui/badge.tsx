import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium',
  {
    variants: {
      tone: {
        positive: 'bg-positive-bg text-positive',
        warning: 'bg-warning-bg text-warning',
        critical: 'bg-critical-bg text-critical',
        neutral: 'bg-ink-900/5 text-ink-700',
        brand: 'bg-brand-100 text-brand-800',
      },
    },
    defaultVariants: { tone: 'neutral' },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, tone, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ tone }), className)} {...props} />;
}
