import Link from 'next/link';
import type { Metadata } from 'next';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export const metadata: Metadata = { title: 'Create your account' };

export default function SignUpPage() {
  return (
    <div>
      <h1 className="text-h1 font-bold tracking-tight text-text-primary">Create your VitalFlow account</h1>
      <p className="mt-1.5 text-body text-text-secondary">
        Start by creating your business profile. You&apos;ll be ready to upload your first bank
        statement in under a minute.
      </p>

      <div className="mt-6 rounded-soft border border-warning/30 bg-warning-muted px-4 py-3 text-label-sm text-text-primary">
        <div className="font-medium text-warning">Dev environment</div>
        <p className="mt-1 text-text-secondary">
          Real auth is in progress. For the buildathon demo, the form below proceeds directly
          to the dashboard with a default dev session.
        </p>
      </div>

      <form className="mt-6 space-y-4" action="/home" method="get">
        <div className="grid grid-cols-2 gap-3">
          <Field label="First name" name="firstName" placeholder="Amara" />
          <Field label="Last name" name="lastName" placeholder="Bishop" />
        </div>
        <Field label="Work email" name="email" type="email" placeholder="you@business.com" />
        <Field label="Business name" name="businessName" placeholder="Amara's Catering" />
        <Field label="Country" name="country" placeholder="Antigua and Barbuda" />
        <Field label="Password" name="password" type="password" placeholder="Choose a strong password" />
        <Button type="submit" size="lg" fullWidth>
          Create account &amp; continue
        </Button>
        <p className="text-label-sm text-text-secondary">
          By creating an account you agree to our terms. VitalFlow is not financial, tax, or
          legal advice — see the disclaimer in the dashboard.
        </p>
      </form>

      <p className="mt-6 text-center text-label text-text-secondary">
        Already have an account?{' '}
        <Link href="/auth/sign-in" className="text-brand hover:text-brand-deep">
          Sign in
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
