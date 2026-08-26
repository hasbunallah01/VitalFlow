import { Eye, FileText, GitBranch, ShieldCheck, Wallet, Workflow } from 'lucide-react';

const features = [
  {
    icon: Wallet,
    title: '5-pillar financial health',
    body:
      'Cash Flow, Revenue, Expenses, Liquidity, Risk. Each pillar decomposes into the metrics that drove the score. Auditable from any number down to individual transactions.',
  },
  {
    icon: Workflow,
    title: 'Three real AI agents',
    body:
      'A Watcher that notices material changes, an Insight Generator that ranks the next action, and a Funding Outreach agent that drafts lender-ready evidence packs.',
  },
  {
    icon: Eye,
    title: 'Funding readiness, named',
    body:
      'For each Caribbean program the business may qualify for, VitalFlow computes the exact point gap, the blocker reason, and how long it would take to clear.',
  },
  {
    icon: GitBranch,
    title: 'Append-only audit ledger',
    body:
      'Every agent run, every recommendation, every access to your data is recorded. The system of record grows over time. Nothing is silently rewritten.',
  },
  {
    icon: FileText,
    title: 'Lender evidence pack',
    body:
      'The same data the AI agents work from is packaged into a structured profile that lenders can consume via a tokenized share link. You stay in control of what is shared.',
  },
  {
    icon: ShieldCheck,
    title: 'Semi-autonomous, not autonomous',
    body:
      'Agents observe, decide, and act on their own within a defined scope. Consequential actions — sending anything to a lender, sharing data — pause for your approval. Always.',
  },
];

export function LandingFeatures() {
  return (
    <section id="product" className="py-20 md:py-24">
      <div className="mx-auto max-w-6xl px-6">
        <div className="max-w-2xl">
          <div className="text-meta-sm uppercase tracking-wider text-brand">Product</div>
          <h2 className="mt-2 text-h1 font-bold tracking-tight text-brand-navy md:text-display">
            A financial intelligence platform, not a one-shot tool.
          </h2>
          <p className="mt-3 text-body text-text-secondary">
            VitalFlow is the missing layer between messy bank statements and the institutions
            that hold capital. The same engine tells the owner why their cash flow is fragile,
            and tells the lender the business's risk profile.
          </p>
        </div>
        <div className="mt-12 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {features.map(({ icon: Icon, title, body }) => (
            <div
              key={title}
              className="rounded-card border border-border bg-card p-6 shadow-card transition-shadow hover:shadow-card-hover"
            >
              <div className="mb-4 flex h-9 w-9 items-center justify-center rounded-lg bg-brand-teal/10 text-brand-teal">
                <Icon className="h-4.5 w-4.5" />
              </div>
              <h3 className="text-h5 font-semibold text-text-primary">{title}</h3>
              <p className="mt-2 text-meta text-text-secondary">{body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
