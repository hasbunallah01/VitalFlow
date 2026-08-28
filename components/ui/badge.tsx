import * as React from 'react';
import { cn } from '@/lib/utils/cn';

type Tone =
  | 'neutral'
  | 'brand'
  | 'success'
  | 'warning'
  | 'danger'
  | 'info';

const toneClasses: Record<Tone, string> = {
  neutral: 'bg-canvas text-text-secondary ring-border',
  brand: 'bg-brand/10 text-brand ring-brand/20',
  success: 'bg-success-muted text-success ring-success/20',
  warning: 'bg-warning-muted text-warning ring-warning/20',
  danger: 'bg-danger-muted text-danger ring-danger/20',
  info: 'bg-brand-cyan/10 text-brand-cyan ring-brand-cyan/20',
};

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  tone?: Tone;
}

export function Badge({ tone = 'neutral', className, children, ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-pill px-2 py-0.5 text-label-sm font-medium ring-1 ring-inset',
        toneClasses[tone],
        className,
      )}
      {...props}
    >
      {children}
    </span>
  );
}
