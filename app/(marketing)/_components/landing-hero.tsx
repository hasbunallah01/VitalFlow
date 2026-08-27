import Link from 'next/link';
import { ArrowRight, Sparkles, ShieldCheck, Bot, Eye, Wallet, Lightbulb } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function LandingHero() {
  return (
    <section className="relative overflow-hidden">
      {/* Subtle background — single soft radial wash, no aggressive blobs */}
      <div
        aria-hidden
        className="absolute inset-0 -z-10"
        style={{
          background:
            'radial-gradient(60% 50% at 70% 0%, rgba(72,216,194,0.12) 0%, rgba(255,255,255,0) 60%),' +
            'radial-gradient(50% 50% at 0% 80%, rgba(22,119,232,0.08) 0%, rgba(255,255,255,0) 60%),' +
            'linear-gradient(180deg, #FFFFFF 0%, #F7F9FC 100%)',
        }}
      />

      <div className="mx-auto max-w-6xl px-6 pb-24 pt-16 md:pb-32 md:pt-24">
        <div className="grid items-center gap-14 md:grid-cols-2">
          <div>
            <div className="mb-5 inline-flex items-center gap-2 rounded-pill border border-border bg-card px-3 py-1 text-meta-sm text-text-secondary">
              <span className="h-1.5 w-1.5 rounded-full bg-positive" />
              FutureCaribbean 2026 · Finance, Payments &amp; MSME Capital
            </div>

            <h1 className="text-[44px] font-bold leading-[1.05] tracking-tight text-text-primary md:text-[56px] md:leading-[1.02]">
              Financial intelligence for your business.
            </h1>

            <p className="mt-5 max-w-xl text-body text-text-secondary md:text-h5 md:font-normal">
              Turn your financial data into clear decisions, actionable insights, and
              funding opportunities — powered by three real AI agents that keep working
              for your business.
            </p>

            <div className="mt-7 flex flex-wrap items-center gap-3">
              <Link href="/auth/sign-up">
                <Button size="lg" className="px-6">Get started <ArrowRight className="h-4 w-4" /></Button>
              </Link>
              <Link href="#how-it-works">
                <Button size="lg" variant="secondary">See how it works</Button>
              </Link>
            </div>

            <div className="mt-8 flex flex-wrap items-center gap-6 text-meta text-text-secondary">
              <span className="inline-flex items-center gap-1.5">
                <ShieldCheck className="h-4 w-4 text-brand-teal" /> Your data, your control
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Bot className="h-4 w-4 text-brand" /> 3 real AI agents
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Sparkles className="h-4 w-4 text-warning" /> Open source · MIT
              </span>
            </div>
          </div>

          <HeroPreview />
        </div>
      </div>
    </section>
  );
}

function HeroPreview() {
  return (
    <div className="relative">
      <div className="rounded-card border border-border bg-card p-6 shadow-card-hover">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img
              src="/brand/vitalflow-logo-icon.png"
              alt="VitalFlow"
              className="h-10 w-10 rounded-2xl"
            />
            <div>
              <div className="text-h5 font-semibold text-text-primary">VitalFlow</div>
              <div className="text-meta-sm text-text-secondary">Financial Intelligence</div>
            </div>
          </div>
          <div className="flex items-center gap-1.5 rounded-pill bg-positive-muted px-2.5 py-1 text-meta-sm font-medium text-positive">
            <span className="h-1.5 w-1.5 rounded-full bg-positive" />
            Live
          </div>
        </div>

        <div className="mt-5 flex items-end gap-5">
          <div>
            <div className="text-meta-sm uppercase tracking-wider text-text-muted">
              Financial Health Score
            </div>
            <div className="mt-1 flex items-baseline gap-2">
              <div className="text-[56px] font-bold leading-none tracking-tight text-text-primary tabular-nums">
                75
              </div>
              <div className="text-h4 text-text-muted">/ 100</div>
            </div>
            <div className="mt-2 inline-flex items-center gap-1.5 rounded-pill bg-positive-muted px-2.5 py-0.5 text-meta-sm font-medium text-positive">
              Healthy
            </div>
          </div>

          <div className="ml-auto h-16 w-32 -mb-1">
            <svg viewBox="0 0 120 60" className="h-full w-full">
              <defs>
                <linearGradient id="hero-grad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#48D8C2" stopOpacity="0.3" />
                  <stop offset="100%" stopColor="#48D8C2" stopOpacity="0" />
                </linearGradient>
              </defs>
              <path
                d="M0 45 L15 38 L30 32 L45 35 L60 22 L75 18 L90 12 L105 15 L120 6 L120 60 L0 60 Z"
                fill="url(#hero-grad)"
              />
              <path
                d="M0 45 L15 38 L30 32 L45 35 L60 22 L75 18 L90 12 L105 15 L120 6"
                fill="none"
                stroke="#20BFE8"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
        </div>

        <div className="mt-5 space-y-2.5">
          {[
            { label: 'Cash Flow', value: 80, color: 'bg-brand' },
            { label: 'Revenue', value: 80, color: 'bg-brand-turquoise' },
            { label: 'Expenses', value: 75, color: 'bg-brand-cyan' },
            { label: 'Liquidity', value: 60, color: 'bg-warning' },
            { label: 'Risk', value: 70, color: 'bg-positive' },
          ].map((p) => (
            <div key={p.label} className="flex items-center gap-3">
              <div className="w-24 text-meta text-text-secondary">{p.label}</div>
              <div className="h-2 flex-1 overflow-hidden rounded-full bg-canvas">
                <div className={`h-full ${p.color}`} style={{ width: `${p.value}%` }} />
              </div>
              <div className="w-10 text-right text-meta-sm tabular-nums text-text-secondary">
                {p.value}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-5 grid grid-cols-3 gap-2 border-t border-border pt-4">
          <AgentPill icon={Eye} label="Watcher" tone="teal" />
          <AgentPill icon={Lightbulb} label="Insight" tone="brand" />
          <AgentPill icon={Wallet} label="Funding" tone="amber" />
        </div>

        <div className="mt-4 text-meta-sm italic text-text-muted">
          Illustrative preview · not real data
        </div>
      </div>
    </div>
  );
}

function AgentPill({
  icon: Icon,
  label,
  tone,
}: {
  icon: typeof Eye;
  label: string;
  tone: 'teal' | 'brand' | 'amber';
}) {
  const toneClasses: Record<typeof tone, string> = {
    teal: 'text-brand-teal bg-brand-teal/10',
    brand: 'text-brand bg-brand/10',
    amber: 'text-warning bg-warning/10',
  };
  return (
    <div className="flex items-center gap-2 rounded-soft border border-border bg-canvas px-2.5 py-2">
      <span className={`h-1.5 w-1.5 rounded-full ${toneClasses[tone]}`} />
      <Icon className={`h-3.5 w-3.5 ${toneClasses[tone].split(' ')[0]}`} />
      <span className="text-meta-sm font-medium text-text-primary">{label}</span>
    </div>
  );
}
