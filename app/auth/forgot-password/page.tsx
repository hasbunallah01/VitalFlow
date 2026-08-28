import Link from 'next/link';
import type { Metadata } from 'next';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export const metadata: Metadata = { title: 'Forgot password' };

export default function ForgotPasswordPage() {
  return (
    <div>
      <h1 className="text-h1 font-bold tracking-tight text-text-primary">Reset your password</h1>
      <p className="mt-1.5 text-body text-text-secondary">
        Enter your email and we&apos;ll send you a reset link.
      </p>

      <div className="mt-6 rounded-soft border border-warning/30 bg-warning-muted px-4 py-3 text-label-sm text-text-primary">
        <div className="font-medium text-warning">Not yet wired up</div>
        <p className="mt-1 text-text-secondary">
          Password reset requires the Resend integration. The form below is a placeholder —
          for the demo, just go to the dashboard directly.
        </p>
      </div>

      <form className="mt-6 space-y-4" action="/home" method="get">
        <Field label="Email" name="email" type="email" placeholder="you@business.com" />
        <Button type="submit" size="lg" fullWidth>
          Send reset link
        </Button>
      </form>

      <p className="mt-6 text-center text-label text-text-secondary">
        Remembered it?{' '}
        <Link href="/auth/sign-in" className="text-brand hover:text-brand-deep">
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
      <span className="text-label-sm font-medium text-text-primary">{label}</span>
      <div className="mt-1.5">
        <Input {...rest} />
      </div>
    </label>
  );
}
