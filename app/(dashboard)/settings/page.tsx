import { Lock, Settings as SettingsIcon, User, Building2, Bell } from 'lucide-react';
import { PageHeader } from '@/components/layout/page-header';
import { Card, CardContent, CardHeader, CardSubtitle, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { getSession } from '@/lib/api/client';

export const dynamic = 'force-dynamic';

export default async function SettingsPage() {
  const session = await getSession().catch(() => null);

  return (
    <div className="space-y-6">
      <PageHeader title="Settings" subtitle="Profile, organization, and security" />

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardSubtitle>Profile</CardSubtitle>
            <CardTitle>Your account</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Row icon={User} label="User ID" value={session?.user.id ?? '—'} mono />
            <Row icon={Building2} label="Organization" value={session?.organization.name ?? '—'} />
            <p className="text-meta-sm text-text-secondary">
              Real profile editing is awaiting the auth integration. This view is read-only.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardSubtitle>Organization</CardSubtitle>
            <CardTitle>Business profile</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <FormField label="Business name" defaultValue={session?.organization.name ?? ''} disabled />
              <FormField label="Country" placeholder="Antigua and Barbuda" disabled />
              <FormField label="Sector" placeholder="Tourism" disabled />
              <FormField label="Default currency" placeholder="XCD" disabled />
            </div>
            <p className="text-meta-sm text-text-secondary">
              Editing business fields requires the auth + org update endpoints. The dev
              bootstrap uses a fixed organisation.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardSubtitle>Preferences</CardSubtitle>
            <CardTitle>Notifications</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Preference
              icon={Bell}
              label="Email notifications for Watcher events"
              status="pending"
              hint="Awaiting Resend integration (env vars not set yet)."
            />
            <Preference
              icon={Bell}
              label="In-app notifications"
              status="on"
              hint="Always on. The Audit page shows the full feed."
            />
            <Preference
              icon={Lock}
              label="Two-factor authentication"
              status="pending"
              hint="Awaiting the auth provider."
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardSubtitle>Security</CardSubtitle>
            <CardTitle>Account security</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Row icon={SettingsIcon} label="Session" value="Dev session (no auth)" mono />
            <Row icon={Lock} label="Password" value="Not set (no auth yet)" />
            <p className="text-meta-sm text-text-secondary">
              The production build of this panel will let you rotate your password, view active
              sessions, and revoke lender share links. All of it sits behind the auth provider
              that is currently in progress.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Row({ icon: Icon, label, value, mono }: { icon: typeof User; label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-border bg-canvas px-3 py-2.5">
      <div className="flex items-center gap-2 text-meta-sm text-text-secondary">
        <Icon className="h-4 w-4" />
        {label}
      </div>
      <span className={mono ? 'font-mono text-meta-sm text-text-primary' : 'text-meta-sm font-medium text-text-primary'}>
        {value}
      </span>
    </div>
  );
}

function FormField({
  label,
  ...rest
}: { label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="block">
      <span className="text-meta-sm font-medium text-text-primary">{label}</span>
      <input
        {...rest}
        className="mt-1.5 block h-10 w-full rounded-lg border border-border bg-card px-3 text-body-sm text-text-primary shadow-card placeholder:text-text-secondary/60 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20 disabled:opacity-70"
      />
    </label>
  );
}

function Preference({
  icon: Icon,
  label,
  status,
  hint,
}: {
  icon: typeof Bell;
  label: string;
  status: 'on' | 'off' | 'pending';
  hint?: string;
}) {
  return (
    <div className="flex items-start justify-between gap-3 rounded-lg border border-border bg-canvas px-3 py-2.5">
      <div>
        <div className="flex items-center gap-2 text-meta-sm font-medium text-text-primary">
          <Icon className="h-4 w-4 text-text-secondary" />
          {label}
        </div>
        {hint ? <p className="mt-0.5 text-meta-sm text-text-secondary">{hint}</p> : null}
      </div>
      <Badge tone={status === 'on' ? 'positive' : status === 'off' ? 'muted' : 'warning'}>
        {status === 'on' ? 'On' : status === 'off' ? 'Off' : 'Pending'}
      </Badge>
    </div>
  );
}
