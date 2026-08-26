import Link from 'next/link';
import type { Metadata } from 'next';
import { Button } from '@/components/ui/button';

export const metadata: Metadata = { title: 'Sign in' };

export default function SignInPage() {
  return (
    <div>
      <h1 className="text-h1 font-bold tracking-tight text-brand-navy">Welcome back</h1>
      <p className="mt-1.5 text-body text-text-secondary">Sign in to continue to VitalFlow.</p>

      <div className="mt-6 rounded-card border border-warning/30 bg-warning-muted px-4 py-3 text-meta-sm text-text-primary">
        <div className="font-medium text-warning">Dev environment</div>
        <p className="mt-1 text-text-secondary">
          Real auth is in progress. For the buildathon demo, VitalFlow uses a single
          <span className="mx-1 rounded bg-card px-1.5 py-0.5 font-mono text-meta-sm">dev-user-1</span>
          session. Set the <code className="font-mono text-meta-sm">RESEND_*</code> env vars later
          to enable magic-link sign-in.
        </p>
      </div>

      <form className="mt-6 space-y-4" action="/dashboard" method="get">
        <Field label="Email" name="email" type="email" placeholder="you@business.com" defaultValue="demo@vitalflow.local" disabled />
        <Field label="Password" name="password" type="password" placeholder="••••••••" defaultValue="••••••••" disabled />
        <div className="flex items-center justify-between text-meta-sm">
          <label className="inline-flex items-center gap-2 text-text-secondary">
            <input type="checkbox" defaultChecked className="h-4 w-4 rounded border-border text-brand focus:ring-brand" />
            Remember me
          </label>
          <Link href="/auth/forgot-password" className="text-brand-bright hover:text-brand">
            Forgot password?
          </Link>
        </div>
        <Button type="submit" size="lg" className="w-full">
          Continue to dashboard
        </Button>
      </form>

      <p className="mt-6 text-center text-meta text-text-secondary">
        Don't have an account?{' '}
        <Link href="/auth/sign-up" className="text-brand-bright hover:text-brand">
          Create one
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
        className="mt-1.5 block h-11 w-full rounded-lg border border-border bg-card px-3.5 text-body text-text-primary shadow-card placeholder:text-text-secondary/60 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20 disabled:opacity-70"
      />
    </label>
  );
}
