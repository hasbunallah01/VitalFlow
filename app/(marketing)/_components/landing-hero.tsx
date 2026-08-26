import Link from 'next/link';
import { ArrowRight, Sparkles, ShieldCheck, Bot, Eye, Wallet, Lightbulb } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AgentPulseDot } from '@/components/dashboard/agent-pulse';

export function LandingHero() {
  return (
    <section className="relative overflow-hidden">
      {/* Ambient background — soft animated gradient blobs + subtle grid */}
      <div aria-hidden className="absolute inset-0 -z-10">
        <div
          className="absolute left-1/4 top-1/4 h-[480px] w-[480px] rounded-full opacity-50 blur-3xl animate-ambient-1"
          style={{ background: 'radial-gradient(circle, rgba(47,128,237,0.35) 0%, transparent 70%)' }}
        />
        <div
          className="absolute right-1/4 top-1/2 h-[420px] w-[420px] rounded-full opacity-40 blur-3xl animate-ambient-2"
          style={{ background: 'radial-gradient(circle, rgba(22,184,166,0.3) 0%, transparent 70%)' }}
        />
        <div
          className="absolute left-1/2 bottom-0 h-[320px] w-[320px] -translate-x-1/2 rounded-full opacity-25 blur-3xl animate-ambient-1"
          style={{ background: 'radial-gradient(circle, rgba(53,208,186,0.3) 0%, transparent 70%)' }}
        />
        <div
          className="absolute inset-0 opacity-[0.35]"
          style={{
            backgroundImage:
              'linear-gradient(rgba(15,23,42,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(15,23,42,0.04) 1px, transparent 1px)',
            backgroundSize: '48px 48px',
            maskImage: 'radial-gradient(ellipse at center, black 0%, transparent 70%)',
            WebkitMaskImage: 'radial-gradient(ellipse at center, black 0%, transparent 70%)',
          }}
        />
      </div>

      <div className="mx-auto max-w-6xl px-6 pb-24 pt-14 md:pb-32 md:pt-20">
        <div className="grid items-center gap-14 md:grid-cols-2">
          <div>
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-border bg-card/80 px-3 py-1 text-meta-sm text-text-secondary shadow-card backdrop-blur">
              <span className="relative inline-flex h-2 w-2">
                <span className="absolute inset-0 animate-pulse-ring rounded-full bg-positive/40" />
                <span className="relative inline-block h-2 w-2 rounded-full bg-positive" />
              </span>
              FutureCaribbean 2026 · Finance, Payments &amp; MSME Capital
            </div>

            <h1 className="text-[44px] font-bold leading-[1.05] tracking-tight text-brand-navy md:text-[56px] md:leading-[1.02]">
              Know the health of your business{' '}
              <span className="relative inline-block">
                <span className="relative z-10 bg-gradient-to-r from-brand-teal via-brand-bright to-brand bg-clip-text text-transparent">
                  before it becomes a problem.
                </span>
              </span>
            </h1>

            <p className="mt-5 max-w-xl text-body text-text-secondary md:text-h5 md:font-normal">
              VitalFlow turns your financial data into clear analysis, ranked recommendations,
              and funding opportunities — powered by three real AI agents, not templates.
            </p>

            <div className="mt-7 flex flex-wrap items-center gap-3">
              <Link href="/auth/sign-up">
                <Button size="lg" className="px-6 shadow-glow-brand">
                  Get started <ArrowRight className="h-4 w-4" />
                </Button>
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
                <Bot className="h-4 w-4 text-brand-bright" /> 3 real AI agents
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Sparkles className="h-4 w-4 text-band-watch" /> Open source · MIT
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
      <div
        aria-hidden
        className="absolute -inset-6 -z-10 rounded-3xl opacity-60 blur-3xl"
        style={{
          background:
            'radial-gradient(ellipse at top right, rgba(22,184,166,0.35) 0%, transparent 60%),' +
            'radial-gradient(ellipse at bottom left, rgba(21,94,239,0.3) 0%, transparent 60%)',
        }}
      />

      <div className="relative rounded-card border border-border bg-card/90 p-6 shadow-card-hover backdrop-blur">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div
                aria-hidden
                className="absolute -inset-1 rounded-2xl bg-gradient-to-br from-brand-teal to-brand opacity-50 blur-md"
              />
              <img
                src="/brand/vitalflow-logo-icon.png"
                alt="VitalFlow"
                className="relative h-11 w-11 rounded-2xl"
              />
            </div>
            <div>
              <div className="text-h5 font-semibold text-text-primary">VitalFlow</div>
              <div className="text-meta-sm text-text-secondary">Financial Intelligence</div>
            </div>
          </div>
          <div className="flex items-center gap-1.5 rounded-full bg-positive-muted px-2.5 py-1 text-meta-sm font-medium text-positive ring-1 ring-inset ring-positive/20">
            <span className="h-1.5 w-1.5 rounded-full bg-positive" />
            Agents watching
          </div>
        </div>

        <div className="mt-5 flex items-end gap-5">
          <div>
            <div className="text-meta-sm uppercase tracking-wider text-text-secondary">
              Financial Health Score
            </div>
            <div className="mt-1 flex items-baseline gap-2">
              <div className="text-[56px] font-bold leading-none tracking-tight text-brand-navy tabular-nums">
                75
              </div>
              <div className="text-h4 text-text-secondary">/ 100</div>
            </div>
            <div className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-band-healthy/10 px-2.5 py-0.5 text-meta-sm font-medium text-band-healthy ring-1 ring-inset ring-band-healthy/20">
              Healthy
            </div>
          </div>

          <div className="ml-auto h-16 w-32 -mb-1">
            <svg viewBox="0 0 120 60" className="h-full w-full">
              <defs>
                <linearGradient id="hero-grad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#16B8A6" stopOpacity="0.35" />
                  <stop offset="100%" stopColor="#16B8A6" stopOpacity="0" />
                </linearGradient>
              </defs>
              <path
                d="M0 45 L15 38 L30 32 L45 35 L60 22 L75 18 L90 12 L105 15 L120 6 L120 60 L0 60 Z"
                fill="url(#hero-grad)"
              />
              <path
                d="M0 45 L15 38 L30 32 L45 35 L60 22 L75 18 L90 12 L105 15 L120 6"
                fill="none"
                stroke="#16B8A6"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
        </div>

        <div className="mt-5 space-y-2">
          {[
            { label: 'Cash Flow', value: 80, color: 'bg-brand' },
            { label: 'Revenue', value: 80, color: 'bg-brand-teal' },
            { label: 'Expenses', value: 75, color: 'bg-brand-bright' },
            { label: 'Liquidity', value: 60, color: 'bg-band-watch' },
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

        <div className="mt-4 text-meta-sm italic text-text-secondary">
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
    teal: 'text-brand-teal',
    brand: 'text-brand',
    amber: 'text-warning',
  };
  return (
    <div className="flex items-center gap-2 rounded-lg border border-border bg-canvas px-2.5 py-2">
      <AgentPulseDot tone={tone} size={8} />
      <Icon className={`h-3.5 w-3.5 ${toneClasses[tone]}`} />
      <span className="text-meta-sm font-medium text-text-primary">{label}</span>
    </div>
  );
}
