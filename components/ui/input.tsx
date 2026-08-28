import * as React from 'react';
import { cn } from '@/lib/utils/cn';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        ref={ref}
        className={cn(
          'block h-11 w-full rounded-soft border border-border bg-card px-3.5 text-body text-text-primary shadow-card',
          'placeholder:text-text-muted',
          'focus:border-brand focus:outline-none focus:ring-4 focus:ring-brand/12',
          'disabled:cursor-not-allowed disabled:bg-canvas disabled:opacity-70',
          className,
        )}
        {...props}
      />
    );
  },
);
Input.displayName = 'Input';

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, ...props }, ref) => {
    return (
      <textarea
        ref={ref}
        className={cn(
          'block w-full rounded-soft border border-border bg-card px-3.5 py-2.5 text-body text-text-primary shadow-card',
          'placeholder:text-text-muted',
          'focus:border-brand focus:outline-none focus:ring-4 focus:ring-brand/12',
          'disabled:cursor-not-allowed disabled:bg-canvas disabled:opacity-70',
          className,
        )}
        {...props}
      />
    );
  },
);
Textarea.displayName = 'Textarea';

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <select
        ref={ref}
        className={cn(
          'block h-11 w-full rounded-soft border border-border bg-card px-3.5 text-body text-text-primary shadow-card',
          'focus:border-brand focus:outline-none focus:ring-4 focus:ring-brand/12',
          'disabled:cursor-not-allowed disabled:bg-canvas disabled:opacity-70',
          className,
        )}
        {...props}
      >
        {children}
      </select>
    );
  },
);
Select.displayName = 'Select';
