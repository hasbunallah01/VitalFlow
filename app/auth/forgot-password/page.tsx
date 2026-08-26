import Link from 'next/link';
import type { Metadata } from 'next';
import { Button } from '@/components/ui/button';

export const metadata: Metadata = { title: 'Forgot password' };

export default function ForgotPasswordPage() {
  return (
    <div>
      <h1 className="text-h1 font-bold tracking-tight text-brand-navy">Reset your password</h1>
      <p className="mt-1.5 text-body text-text-secondary">
        Enter your email and we'll send you a reset link.
      </p>

      <div className="mt-6 rounded-card border border-warning/30 bg-warning-muted px-4 py-3 text-meta-sm text-text-primary">
        <div className="font-medium text-warning">Not yet wired up</div>
        <p className="mt-1 text-text-secondary">
          Password reset requires the Resend integration. The form below is a placeholder — for
          the demo, just go to the dashboard directly.
        </p>
      </div>

      <form className="mt-6 space-y-4" action="/dashboard" method="get">
        <Field label="Email" name="email" type="email" placeholder="you@business.com" />
        <Button type="submit" size="lg" className="w-full">
          Send reset link
        </Button>
      </form>

      <p className="mt-6 text-center text-meta text-text-secondary">
        Remembered it?{' '}
        <Link href="/auth/sign-in" className="text-brand-bright hover:text-brand">
          Back to sign in
        </Link>
      </p>
    </div>
  );
}

function Field({
  label,
  ...rest
}: { label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="block">
      <span className="text-meta-sm font-medium text-text-primary">{label}</span>
      <input
        {...rest}
        className="mt-1.5 block h-11 w-full rounded-lg border border-border bg-card px-3.5 text-body text-text-primary shadow-card placeholder:text-text-secondary/60 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
      />
    </label>
  );
}
