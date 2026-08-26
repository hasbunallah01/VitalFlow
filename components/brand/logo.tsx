import { cn } from '@/lib/utils/cn';

type Size = 'sm' | 'md' | 'lg' | 'xl' | 'auth';

const sizeMap: Record<Size, { box: number; px: number }> = {
  sm: { box: 24, px: 24 },
  md: { box: 32, px: 32 },
  lg: { box: 40, px: 40 },
  xl: { box: 56, px: 56 },
  auth: { box: 64, px: 64 },
};

interface LogoProps {
  size?: Size;
  withWordmark?: boolean;
  /** When true, render the icon-only square (no wordmark). */
  iconOnly?: boolean;
  className?: string;
}

/**
 * Brand logo — uses the static asset at /public/brand/.
 * The icon variant is the square rounded-mark; the wordmark variant adds
 * "VitalFlow" next to it using Inter 700 with a teal accent on "Flow".
 */
export function Logo({ size = 'md', withWordmark = false, iconOnly = false, className }: LogoProps) {
  const { box, px } = sizeMap[size];
  return (
    <span className={cn('inline-flex items-center gap-2.5', className)}>
      <span
        className="inline-block overflow-hidden rounded-[28%] bg-canvas"
        style={{ width: box, height: box }}
        aria-hidden
      >
        <img
          src="/brand/vitalflow-logo-icon.png"
          alt=""
          width={px}
          height={px}
          className="block h-full w-full object-cover"
        />
      </span>
      {withWordmark && !iconOnly ? (
        <span className="select-none text-[1.05em] font-bold leading-none tracking-tight text-brand-navy">
          Vital<span className="text-brand">Flow</span>
        </span>
      ) : null}
    </span>
  );
}

/**
 * Logo for the auth pages — large centered icon + wordmark + tagline.
 */
export function LogoCentered({ tagline = 'Financial Intelligence' }: { tagline?: string }) {
  return (
    <div className="flex flex-col items-center gap-3">
      <Logo size="auth" />
      <div className="text-center">
        <div className="text-h2 font-bold tracking-tight text-brand-navy">
          Vital<span className="text-brand">Flow</span>
        </div>
        <div className="mt-1 text-meta uppercase tracking-[0.18em] text-text-secondary">
          {tagline}
        </div>
      </div>
    </div>
  );
}
