import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * `cn` — combine class strings with conflict-aware Tailwind merging.
 * Standard shadcn-style helper. Used by every component.
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
