import Link from 'next/link';
import { ArrowRight, BarChart3, Sparkles, ShieldCheck, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function LandingHero() {
  return (
    <section className="relative overflow-hidden">
      {/* Soft background — no glassmorphism, just a calm wash */}
      <div
        aria-hidden
        className="absolute inset-0 -z-10"
        style={{
          background:
            'radial-gradient(60% 60% at 80% 10%, rgba(47,128,237,0.10) 0%, rgba(255,255,255,0) 60%),' +
            'radial-gradient(40% 40% at 10% 40%, rgba(21,184,166,0.08) 0%, rgba(255,255,255,0) 60%),' +
            'linear-gradient(180deg, #FFFFFF 0%, #F8FAFC 100%)',
        }}
      />
      <div className="mx-auto max-w-6xl px-6 pb-20 pt-20 md:pb-28 md:pt-28">
        <div className="grid items-center gap-12 md:grid-cols-2">
          <div>
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-meta-sm text-text-secondary shadow-card">
              <span className="h-1.5 w-1.5 rounded-full bg-positive" />
              FutureCaribbean 2026 · Finance, Payments & MSME Capital
            </div>
            <h1 className="text-display md:text-[40px] md:leading-[48px] font-bold tracking-tight text-brand-navy">
              Know the health of your business{' '}
              <span className="text-brand">before it becomes a problem.</span>
            </h1>
            <p className="mt-5 max-w-xl text-body text-text-secondary">
              VitalFlow turns your financial data into clear analysis, actionable insights, and
              funding opportunities — powered by real financial intelligence, not templates.
            </p>
            <div className="mt-7 flex flex-wrap items-center gap-3">
              <Link href="/auth/sign-up">
                <Button size="lg">Get started <ArrowRight className="h-4 w-4" /></Button>
              </Link>
              <Link href="#how-it-works">
                <Button size="lg" variant="secondary">See how it works</Button>
              </Link>
            </div>
            <div className="mt-8 flex items-center gap-6 text-meta text-text-secondary">
              <span className="inline-flex items-center gap-1.5">
                <ShieldCheck className="h-4 w-4 text-brand-teal" /> Your data, your control
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Sparkles className="h-4 w-4 text-brand-bright" /> Real AI agents
              </span>
            </div>
          </div>

          <HeroPreview />
        </div>
      </div>
    </section>
  );
}

/**
 * Hero preview — a clean illustration of the dashboard. Uses the same
 * layout language as the real product so the visual is recognisable,
 * but every value is placeholder text/numbers that are clearly
 * illustrative (italicised, lower opacity). No fake customer data.
 */
function HeroPreview() {
  return (
    <div className="relative">
      <div className="rounded-card border border-border bg-card p-5 shadow-card-hover">
        <div className="flex items-center justify-between">
          <div className="text-meta-sm uppercase tracking-wider text-text-secondary">
            Financial Health Score
          </div>
          <span className="rounded-full bg-band-healthy/10 px-2.5 py-0.5 text-meta-sm font-medium text-band-healthy ring-1 ring-inset ring-band-healthy/20">
            Healthy
          </span>
        </div>
        <div className="mt-3 flex items-baseline gap-3">
          <div className="text-number-lg font-bold text-brand-navy tabular-nums">75</div>
          <div className="text-h4 text-text-secondary">/ 100</div>
        </div>
        {/* Pillar bars — illustrative, in brand palette */}
        <div className="mt-5 space-y-2.5">
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
          <MiniStat icon={<BarChart3 className="h-3.5 w-3.5" />} label="Agents" value="3" />
          <MiniStat icon={<TrendingUp className="h-3.5 w-3.5" />} label="Months" value="12" />
          <MiniStat icon={<Sparkles className="h-3.5 w-3.5" />} label="Insights" value="—" />
        </div>
        <div className="mt-3 text-meta-sm italic text-text-secondary">
          Illustrative preview · not real data
        </div>
      </div>
    </div>
  );
}

function MiniStat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-canvas px-3 py-2">
      <div className="flex items-center gap-1.5 text-meta-sm text-text-secondary">
        {icon}
        {label}
      </div>
      <div className="mt-0.5 text-h5 font-semibold tabular-nums text-text-primary">{value}</div>
    </div>
  );
}
