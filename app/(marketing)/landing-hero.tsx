import Link from 'next/link';
import { ArrowRight, TrendingUp, BarChart3, Wallet, Lightbulb } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScoreRing } from '@/components/dashboard/score-ring';

export function LandingHero() {
  return (
    <section className="relative overflow-hidden">
      {/* Soft background — single radial wash, no heavy blobs */}
      <div
        aria-hidden
        className="absolute inset-0 -z-10"
        style={{
          background:
            'radial-gradient(50% 60% at 80% 20%, rgba(53, 207, 165, 0.10) 0%, rgba(255,255,255,0) 60%),' +
            'radial-gradient(40% 50% at 0% 70%, rgba(18, 104, 232, 0.08) 0%, rgba(255,255,255,0) 60%),' +
            'linear-gradient(180deg, #FFFFFF 0%, #F7F9FC 100%)',
        }}
      />
      <div className="mx-auto max-w-[1200px] px-6 pb-20 pt-14 md:pb-28 md:pt-24">
        <div className="grid items-center gap-12 md:grid-cols-2">
          <div>
            <div className="mb-5 inline-flex items-center gap-2 rounded-pill border border-border bg-card px-3 py-1 text-label-sm text-text-secondary">
              <span className="h-1.5 w-1.5 rounded-full bg-success" />
              FutureCaribbean 2026 · Finance, Payments &amp; MSME Capital
            </div>
            <h1 className="text-[40px] font-bold leading-[1.08] tracking-tight text-text-primary md:text-[56px] md:leading-[1.04]">
              Understand your business.{' '}
              <span className="text-brand">Move with confidence.</span>
            </h1>
            <p className="mt-5 max-w-xl text-body text-text-secondary md:text-h5 md:font-normal">
              VitalFlow turns your financial data into clear analysis, actionable
              recommendations, and funding opportunities — so you can make the next move
              with confidence.
            </p>
            <div className="mt-7 flex flex-wrap items-center gap-3">
              <Link href="/auth/sign-up">
                <Button size="lg" className="px-6">Get started <ArrowRight className="h-4 w-4" /></Button>
              </Link>
              <Link href="#how">
                <Button size="lg" variant="secondary">See How It Works</Button>
              </Link>
            </div>
            <div className="mt-7 flex items-center gap-2 text-label-sm text-text-muted">
              Trusted by Caribbean businesses · MIT licensed · Open source
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
      <div className="rounded-card border border-border bg-card p-5 shadow-pop">
        <div className="flex items-center justify-between">
          <div className="text-label-sm uppercase tracking-wider text-text-muted">
            Financial Health Score
          </div>
          <Badge tone="success">Healthy</Badge>
        </div>
        <div className="mt-3 flex items-center gap-5">
          <ScoreRing score={75.4} band="Healthy" size={150} />
          <div className="flex-1 space-y-1.5">
            {[
              { label: 'Cash Flow', value: 82 },
              { label: 'Revenue', value: 78 },
              { label: 'Expenses', value: 71 },
              { label: 'Liquidity', value: 74 },
              { label: 'Risk', value: 68 },
            ].map((p) => (
              <div key={p.label} className="flex items-center gap-2 text-label-sm">
                <span className="w-16 text-text-secondary">{p.label}</span>
                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-canvas">
                  <div className="h-full bg-brand" style={{ width: `${p.value}%` }} />
                </div>
                <span className="w-8 text-right tabular-nums text-text-secondary">
                  {p.value}
                </span>
              </div>
            ))}
          </div>
        </div>
        <div className="mt-4 grid grid-cols-3 gap-2 border-t border-border pt-4">
          <Tile icon={BarChart3} label="Cash Flow" />
          <Tile icon={TrendingUp} label="Insights" />
          <Tile icon={Wallet} label="Funding" />
        </div>
        <div className="mt-3 text-label-sm italic text-text-muted">
          Illustrative preview · not real data
        </div>
      </div>
    </div>
  );
}

function Tile({ icon: Icon, label }: { icon: typeof TrendingUp; label: string }) {
  return (
    <div className="flex items-center gap-2 rounded-soft border border-border bg-canvas px-2.5 py-2">
      <Icon className="h-3.5 w-3.5 text-brand" />
      <span className="text-label-sm font-medium text-text-primary">{label}</span>
    </div>
  );
}
