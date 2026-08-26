import { Upload, LineChart, Sparkles, CheckCircle2 } from 'lucide-react';

const steps = [
  {
    n: '01',
    title: 'Connect your financial data',
    body:
      'Upload your bank statement as a CSV. VitalFlow handles the messy, inconsistent exports that Caribbean banks produce.',
    icon: Upload,
  },
  {
    n: '02',
    title: 'VitalFlow analyzes it',
    body:
      'Our deterministic financial engine evaluates the business across five pillars — cash flow, revenue, expenses, liquidity, and risk. Auditable, byte-comparable, no black boxes.',
    icon: LineChart,
  },
  {
    n: '03',
    title: 'AI finds what matters',
    body:
      'Three real AI agents watch the business, surface what changed, draft recommendations, and prepare funding outreach plans. Every number in their output is grounded in the deterministic engine.',
    icon: Sparkles,
  },
  {
    n: '04',
    title: 'Take action',
    body:
      'Review insights and funding opportunities. You stay in control — every consequential action (sending anything to a lender) waits for your approval.',
    icon: CheckCircle2,
  },
];

export function LandingHowItWorks() {
  return (
    <section id="how-it-works" className="border-t border-border bg-canvas py-20 md:py-24">
      <div className="mx-auto max-w-6xl px-6">
        <div className="max-w-2xl">
          <div className="text-meta-sm uppercase tracking-wider text-brand">How it works</div>
          <h2 className="mt-2 text-h1 font-bold tracking-tight text-brand-navy md:text-display">
            From a CSV to a lender-ready profile in minutes.
          </h2>
          <p className="mt-3 text-body text-text-secondary">
            VitalFlow is a closed-loop agentic system. The deterministic engine does the math;
            the AI agents turn the math into meaning. Nothing is invented.
          </p>
        </div>
        <div className="mt-12 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {steps.map(({ n, title, body, icon: Icon }) => (
            <div
              key={n}
              className="rounded-card border border-border bg-card p-6 shadow-card transition-shadow hover:shadow-card-hover"
            >
              <div className="mb-4 flex items-center justify-between">
                <div className="text-meta-sm font-semibold uppercase tracking-wider text-text-secondary">
                  {n}
                </div>
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand/10 text-brand">
                  <Icon className="h-4.5 w-4.5" />
                </div>
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
