import { Card, CardContent, CardHeader, CardSubtitle, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { getSession } from '@/lib/api/client';

export const dynamic = 'force-dynamic';

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const { tab } = await searchParams;
  const activeTab =
    tab === 'business' || tab === 'notifications' || tab === 'security' ? tab : 'profile';
  const session = await getSession().catch(() => null);
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-h1 font-bold tracking-tight text-text-primary">Settings</h1>
        <p className="mt-1.5 text-body text-text-secondary">
          Manage your account, business, and notification preferences.
        </p>
      </div>

      <Tabs value={activeTab}>
        <TabsList>
          <TabsTrigger value="profile" href="/settings">Profile</TabsTrigger>
          <TabsTrigger value="business" href="/settings?tab=business">Business</TabsTrigger>
          <TabsTrigger value="notifications" href="/settings?tab=notifications">Notifications</TabsTrigger>
          <TabsTrigger value="security" href="/settings?tab=security">Security</TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="mt-6">
          <Card>
            <CardHeader>
              <CardSubtitle>Your account</CardSubtitle>
              <CardTitle>Profile information</CardTitle>
            </CardHeader>
            <CardContent>
              <form className="space-y-4" action="/home" method="get">
                <Field label="Full name" name="fullName" defaultValue="Demo Owner" />
                <Field label="Email" name="email" type="email" defaultValue="demo@vitalflow.local" />
                <Field label="Role" name="role" defaultValue="Owner" disabled />
                <div className="flex justify-end">
                  <Button type="submit" disabled>Save changes</Button>
                </div>
                <p className="text-label-sm text-text-secondary">
                  Profile editing is wired to the auth flow (deferred to post-buildathon).
                </p>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="business" className="mt-6">
          <Card>
            <CardHeader>
              <CardSubtitle>Organization</CardSubtitle>
              <CardTitle>Business information</CardTitle>
            </CardHeader>
            <CardContent>
              <form className="space-y-4" action="/home" method="get">
                <Field
                  label="Business name"
                  name="name"
                  defaultValue={session?.organization.name ?? 'VitalFlow Demo Organization'}
                />
                <Field label="Country" name="country" defaultValue="Antigua and Barbuda" />
                <Field label="Currency" name="currency" defaultValue="XCD" />
                <Field label="Industry" name="industry" defaultValue="Hospitality" />
                <div className="flex justify-end">
                  <Button type="submit" disabled>Save changes</Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications" className="mt-6">
          <Card>
            <CardHeader>
              <CardSubtitle>How we reach you</CardSubtitle>
              <CardTitle>Notifications</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="divide-y divide-border">
                {[
                  {
                    title: 'Watcher alerts',
                    body: 'Notify me when a significant financial change is detected.',
                    defaultOn: true,
                  },
                  {
                    title: 'Weekly insights',
                    body: 'A summary of new recommendations and funding updates.',
                    defaultOn: true,
                  },
                  {
                    title: 'Funding outreach status',
                    body: 'When a lender views my evidence pack.',
                    defaultOn: true,
                  },
                ].map((row) => (
                  <li key={row.title} className="flex items-center justify-between py-3">
                    <div>
                      <div className="text-body-sm font-medium text-text-primary">
                        {row.title}
                      </div>
                      <div className="text-label-sm text-text-secondary">{row.body}</div>
                    </div>
                    <Toggle defaultOn={row.defaultOn} />
                  </li>
                ))}
              </ul>
              <p className="mt-3 text-label-sm text-text-secondary">
                Real email delivery is wired to Resend (deferred to post-buildathon).
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security" className="mt-6">
          <Card>
            <CardHeader>
              <CardSubtitle>Account safety</CardSubtitle>
              <CardTitle>Security</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3 text-label-sm">
                <li className="flex items-center justify-between">
                  <span className="text-text-secondary">Two-factor authentication</span>
                  <Button size="sm" variant="secondary" disabled>Enable</Button>
                </li>
                <li className="flex items-center justify-between">
                  <span className="text-text-secondary">Active sessions</span>
                  <Button size="sm" variant="secondary" disabled>Review</Button>
                </li>
                <li className="flex items-center justify-between">
                  <span className="text-text-secondary">Export account data</span>
                  <Button size="sm" variant="secondary" disabled>Request</Button>
                </li>
                <li className="flex items-center justify-between">
                  <span className="text-danger">Delete account</span>
                  <Button size="sm" variant="danger" disabled>Delete</Button>
                </li>
              </ul>
              <p className="mt-4 text-label-sm text-text-secondary">
                Security controls activate with real auth (deferred to post-buildathon).
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
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

function Toggle({ defaultOn }: { defaultOn: boolean }) {
  return (
    <label className="inline-flex cursor-not-allowed items-center">
      <input
        type="checkbox"
        defaultChecked={defaultOn}
        disabled
        className="h-5 w-9 cursor-not-allowed appearance-none rounded-full bg-canvas transition-colors checked:bg-brand"
        aria-label="Toggle"
      />
    </label>
  );
}
