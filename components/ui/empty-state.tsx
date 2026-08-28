import * as React from 'react';
import { cn } from '@/lib/utils/cn';

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export function EmptyState({ icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center rounded-card border border-dashed border-border bg-canvas/50 px-6 py-12 text-center',
        className,
      )}
    >
      {icon ? <div className="mb-3 text-text-muted">{icon}</div> : null}
      <h3 className="text-h5 font-semibold text-text-primary">{title}</h3>
      {description ? (
        <p className="mt-1.5 max-w-md text-body-sm text-text-secondary">{description}</p>
      ) : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}
