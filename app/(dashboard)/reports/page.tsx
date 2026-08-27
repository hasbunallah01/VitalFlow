import { FileText, ShieldCheck, Wallet, Download, Clock, Sparkles } from 'lucide-react';
import { PageHeader } from '@/components/layout/page-header';
import { Card, CardContent, CardHeader, CardSubtitle, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

export const dynamic = 'force-dynamic';

const REPORTS = [
  {
    id: 'financial-health',
    title: 'Financial Health Report',
    description:
      'A complete financial-health assessment with the 5-pillar score, monthly trend, and anomalies — formatted for sharing with a banker or partner.',
    icon: FileText,
    status: 'coming-soon' as const,
    eta: 'In progress',
  },
  {
    id: 'funding-readiness',
    title: 'Funding Readiness Report',
    description:
      'Per-program readiness breakdown showing the exact gap to eligibility for every Caribbean funding program the business is close to qualifying for.',
    icon: ShieldCheck,
    status: 'coming-soon' as const,
    eta: 'Next milestone',
  },
  {
    id: 'lender-evidence-pack',
    title: 'Lender Evidence Pack',
    description:
      'A structured profile of the business designed for lender underwriting — generated when an outreach is approved and a share link is issued.',
    icon: Wallet,
    status: 'coming-soon' as const,
    eta: 'Awaiting auth',
  },
];

export default function ReportsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Reports"
        subtitle="Shareable, lender-ready documents generated from your data"
      />

      <div className="rounded-card border border-border bg-card p-5 shadow-card">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-soft bg-brand-teal/10 text-brand-teal">
            <Sparkles className="h-4 w-4" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-h5 font-semibold text-text-primary">
              Reports are generated from real data
            </div>
            <p className="mt-0.5 text-meta text-text-secondary">
              Every report pulls live numbers from the deterministic engine and the agent
              audit trail. We do not generate fake PDFs.
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {REPORTS.map(({ id, title, description, icon: Icon, status, eta }) => (
          <Card key={id} className="flex flex-col">
            <CardHeader>
              <div className="flex items-start justify-between gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-soft bg-brand/8 text-brand">
                  <Icon className="h-5 w-5" />
                </div>
                <Badge tone="muted">
                  <Clock className="h-3 w-3" /> {eta}
                </Badge>
              </div>
              <CardTitle className="mt-3">{title}</CardTitle>
              <CardSubtitle className="mt-1.5">{description}</CardSubtitle>
            </CardHeader>
            <CardContent className="mt-auto">
              <Button variant="secondary" size="sm" disabled className="w-full">
                <Download className="h-4 w-4" /> Coming soon
              </Button>
              <p className="mt-2 text-center text-meta-sm text-text-secondary">
                PDF generation endpoint pending
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
