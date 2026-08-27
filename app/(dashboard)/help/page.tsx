import Link from 'next/link';
import { HelpCircle, FileText, Mail, MessageSquare, BookOpen, ExternalLink } from 'lucide-react';
import { PageHeader } from '@/components/layout/page-header';
import { Card, CardContent, CardHeader, CardSubtitle, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export const dynamic = 'force-dynamic';

const FAQ = [
  {
    q: 'What is VitalFlow?',
    a: 'VitalFlow is a Caribbean MSME financial intelligence platform. It turns a bank statement into a 5-pillar health score, then a set of AI agents keep working for the business — watching for material changes, drafting recommendations, and preparing lender-ready funding packages.',
  },
  {
    q: 'Is my financial data safe?',
    a: 'Your statement is processed in the serverless backend and the data lives in your own organisation row. The agents read the same data and write to the same database. We never send your data to a third-party LLM without your approval, and even when we do, we redact identifying details before the call.',
  },
  {
    q: 'Why are the scores and recommendations different each time?',
    a: 'The 5-pillar score is fully deterministic — it is the same number every time for the same input. Recommendations are produced by a real LLM and may vary slightly in wording, but the underlying metrics are stable. The audit page shows the exact model and tokens used for every agent run.',
  },
  {
    q: 'Can I share my analysis with a lender?',
    a: 'Yes. On the Funding page, every outreach draft has an Approve button. After you approve, you can create a share link, copy it, and send it to the lender. The lender can view the structured profile at the link; you can revoke the link at any time.',
  },
  {
    q: 'What does VitalFlow not do?',
    a: 'VitalFlow does not move money, submit loan applications, or make credit decisions. We help you understand your business and prepare the evidence pack — the actual application happens on the official lender or program website.',
  },
  {
    q: 'Is the source open?',
    a: 'Yes — MIT licensed. The repository is at github.com/hasbunallah01/VitalFlow. The deterministic scoring engine, the agents, and the orchestrator are all open source.',
  },
];

const RESOURCES = [
  { href: 'https://github.com/hasbunallah01/VitalFlow', label: 'Source on GitHub', icon: ExternalLink },
  { href: '/audit', label: 'Audit trail', icon: FileText },
  { href: '/activity', label: 'Activity timeline', icon: MessageSquare },
];

export default function HelpPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Help & FAQ"
        subtitle="Everything you need to know about using VitalFlow"
      />

      <div className="grid gap-4 md:grid-cols-3">
        {RESOURCES.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className="group flex items-center gap-3 rounded-card border border-border bg-card p-4 shadow-card transition-shadow hover:shadow-card-hover"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-soft bg-brand/8 text-brand">
              <Icon className="h-4 w-4" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-meta-sm font-medium text-text-primary">{label}</div>
              <div className="text-meta-sm text-text-secondary">Open</div>
            </div>
          </Link>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardSubtitle>FAQ</CardSubtitle>
          <CardTitle>Frequently asked questions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {FAQ.map((item, i) => (
            <details
              key={i}
              className="group rounded-soft border border-border bg-canvas/50 open:bg-card open:shadow-card"
            >
              <summary className="flex cursor-pointer list-none items-center gap-3 px-4 py-3">
                <HelpCircle className="h-4 w-4 shrink-0 text-brand" />
                <span className="text-meta font-semibold text-text-primary">{item.q}</span>
                <span className="ml-auto text-meta-sm text-text-secondary group-open:rotate-180 transition-transform">
                  ⌄
                </span>
              </summary>
              <p className="px-4 pb-4 text-meta text-text-secondary">{item.a}</p>
            </details>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardSubtitle>Contact</CardSubtitle>
          <CardTitle>Get in touch</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex items-center gap-3 rounded-soft border border-border bg-canvas/50 px-4 py-3 text-meta">
            <Mail className="h-4 w-4 text-text-secondary" />
            <span className="text-text-secondary">Support:</span>
            <a href="mailto:hello@vitalflow.app" className="font-medium text-brand">
              hello@vitalflow.app
            </a>
          </div>
          <div className="flex items-center gap-3 rounded-soft border border-border bg-canvas/50 px-4 py-3 text-meta">
            <BookOpen className="h-4 w-4 text-text-secondary" />
            <span className="text-text-secondary">Buildathon:</span>
            <Badge tone="muted">FutureCaribbean 2026 · Finance, Payments &amp; MSME Capital</Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
