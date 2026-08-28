import { cn } from '@/lib/utils/cn';

type Size = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'auth';

const sizeMap: Record<Size, { box: number }> = {
  xs: { box: 20 },
  sm: { box: 24 },
  md: { box: 32 },
  lg: { box: 40 },
  xl: { box: 56 },
  auth: { box: 72 },
};

interface LogoProps {
  size?: Size;
  withWordmark?: boolean;
  className?: string;
}

/**
 * Brand logo — uses the 3D sphere mark at /public/brand/vitalflow-logo.png.
 * The "withWordmark" variant adds a clean Inter wordmark next to the icon.
 */
export function Logo({ size = 'md', withWordmark = false, className }: LogoProps) {
  const { box } = sizeMap[size];
  return (
    <span className={cn('inline-flex items-center gap-2', className)}>
      <img
        src="/brand/vitalflow-logo.png"
        alt="VitalFlow"
        width={box}
        height={box}
        className="block shrink-0 object-contain"
        style={{ width: box, height: box }}
      />
      {withWordmark ? (
        <span className="select-none text-[1.1em] font-bold leading-none tracking-tight text-text-primary">
          Vital<span className="text-brand">Flow</span>
        </span>
      ) : null}
    </span>
  );
}

/**
 * Logo for the auth pages — larger centered icon + wordmark + tagline.
 */
export function LogoCentered({ tagline = 'Financial Intelligence' }: { tagline?: string }) {
  return (
    <div className="flex flex-col items-center gap-3">
      <Logo size="auth" />
      <div className="text-center">
        <div className="text-h2 font-bold tracking-tight text-text-primary">
          Vital<span className="text-brand">Flow</span>
        </div>
        <div className="mt-1 text-label uppercase tracking-[0.18em] text-text-secondary">
          {tagline}
        </div>
      </div>
    </div>
  );
}
