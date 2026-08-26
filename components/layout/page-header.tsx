import { cn } from '@/lib/utils/cn';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  className?: string;
}

export function PageHeader({ title, subtitle, action, className }: PageHeaderProps) {
  return (
    <div className={cn('flex flex-wrap items-end justify-between gap-4', className)}>
      <div>
        <h1 className="text-h1 font-bold tracking-tight text-brand-navy">{title}</h1>
        {subtitle ? <p className="mt-1 text-body text-text-secondary">{subtitle}</p> : null}
      </div>
      {action ? <div>{action}</div> : null}
    </div>
  );
}
