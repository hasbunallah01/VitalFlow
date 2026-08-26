import * as React from 'react';
import { cn } from '@/lib/utils/cn';

type Tone =
  | 'neutral'
  | 'brand'
  | 'teal'
  | 'positive'
  | 'warning'
  | 'negative'
  | 'muted';

const toneClasses: Record<Tone, string> = {
  neutral: 'bg-canvas text-text-secondary ring-border',
  brand: 'bg-brand/10 text-brand ring-brand/20',
  teal: 'bg-brand-teal/10 text-brand-teal ring-brand-teal/20',
  positive: 'bg-positive-muted text-positive ring-positive/20',
  warning: 'bg-warning-muted text-warning ring-warning/20',
  negative: 'bg-negative-muted text-negative ring-negative/20',
  muted: 'bg-canvas text-text-secondary ring-border',
};

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  tone?: Tone;
}

export function Badge({ tone = 'neutral', className, children, ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-meta-sm font-medium ring-1 ring-inset',
        toneClasses[tone],
        className,
      )}
      {...props}
    >
      {children}
    </span>
  );
}
