import Link from 'next/link';
import { Building2, MapPin, Globe, Edit3 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardSubtitle, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { getSession } from '@/lib/api/client';
// formatDate is reserved for post-MVP enhancements once the API exposes user.createdAt.

export const dynamic = 'force-dynamic';

export default async function ProfilePage() {
  const session = await getSession().catch(() => null);
  if (!session) {
    return (
      <div>
        <h1 className="text-h1 font-bold tracking-tight text-text-primary">Profile</h1>
        <p className="mt-2 text-body text-text-secondary">Loading…</p>
      </div>
    );
  }
  const { organization, user } = session;
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-h1 font-bold tracking-tight text-text-primary">Profile</h1>
          <p className="mt-1.5 text-body text-text-secondary">
            Your business and account information.
          </p>
        </div>
        <Link href="/settings">
          <Button variant="secondary" size="md">
            <Edit3 className="h-4 w-4" /> Edit in settings
          </Button>
        </Link>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardContent>
            <div className="flex items-center gap-3">
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-brand text-h4 font-semibold text-white">
                V
              </span>
              <div className="min-w-0 flex-1">
                <div className="truncate text-h5 font-semibold text-text-primary">
                  Demo Owner
                </div>
                <div className="truncate text-label-sm text-text-secondary">
                  ID: {user.id}
                </div>
              </div>
            </div>
            <dl className="mt-5 space-y-3 text-label-sm">
              <Row label="Account role" value="Owner" />
              <Row label="Sign-in method" value="Dev session" />
              <Row label="Email verified" value="Yes (dev mode)" />
            </dl>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center gap-2 text-label-sm text-text-secondary">
              <Building2 className="h-3.5 w-3.5" />
              Business information
            </div>
            <CardTitle>{organization.name}</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid gap-4 sm:grid-cols-2">
              <Row label="Legal name" value={organization.name} icon={<Building2 className="h-3.5 w-3.5" />} />
              <Row label="Country" value="Antigua and Barbuda" icon={<MapPin className="h-3.5 w-3.5" />} />
              <Row label="Currency" value="XCD" />
              <Row label="Trading name" value={organization.name} />
              <Row label="Business type" value="Sole proprietorship" />
              <Row label="Tax ID" value="(pending)" icon={<Globe className="h-3.5 w-3.5" />} />
            </dl>
            <div className="mt-5 flex items-center gap-2">
              <Badge tone="brand">ID: {organization.id}</Badge>
            </div>
            <p className="mt-4 text-label-sm text-text-secondary">
              Real business profile editing lives behind the auth flow (deferred to
              post-buildathon). For now the dev session injects a default
              <span className="mx-1 font-mono text-label-sm">VitalFlow Demo Organization</span>.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Row({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon?: React.ReactNode;
}) {
  return (
    <div>
      <dt className="flex items-center gap-1.5 text-micro uppercase tracking-wider text-text-muted">
        {icon}
        {label}
      </dt>
      <dd className="mt-1 text-body-sm font-medium text-text-primary">{value}</dd>
    </div>
  );
}
