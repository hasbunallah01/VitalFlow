import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cn } from '@/lib/utils/cn';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'subtle';
type Size = 'sm' | 'md' | 'lg';

const variantClasses: Record<Variant, string> = {
  primary:
    'bg-brand text-white hover:bg-brand-bright active:bg-brand-bright shadow-sm focus-visible:ring-brand',
  secondary:
    'bg-card text-text-primary border border-border hover:border-brand/40 hover:bg-canvas',
  ghost: 'text-text-primary hover:bg-canvas',
  danger: 'bg-negative text-white hover:bg-negative/90',
  subtle: 'bg-brand/10 text-brand hover:bg-brand/15',
};

const sizeClasses: Record<Size, string> = {
  sm: 'h-9 px-3 text-meta-sm',
  md: 'h-11 px-4 text-body-sm',
  lg: 'h-12 px-5 text-body',
};

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  asChild?: boolean;
  loading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    { className, variant = 'primary', size = 'md', asChild = false, loading, children, disabled, ...props },
    ref,
  ) => {
    const Comp = asChild ? Slot : 'button';
    return (
      <Comp
        ref={ref}
        disabled={disabled || loading}
        className={cn(
          'inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-colors',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-card',
          'disabled:pointer-events-none disabled:opacity-50',
          variantClasses[variant],
          sizeClasses[size],
          className,
        )}
        {...props}
      >
        {loading ? <Spinner /> : null}
        {children}
      </Comp>
    );
  },
);
Button.displayName = 'Button';

function Spinner() {
  return (
    <svg
      className="h-4 w-4 animate-spin"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      aria-hidden
    >
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
    </svg>
  );
}
