import { Upload, LineChart, Lightbulb, Target } from 'lucide-react';

const STEPS = [
  {
    n: '01',
    title: 'Upload',
    body: 'Upload your bank statement or CSV securely.',
    icon: Upload,
  },
  {
    n: '02',
    title: 'Analyze',
    body: 'Our AI analyzes your financial health across 5 key pillars.',
    icon: LineChart,
  },
  {
    n: '03',
    title: 'Insights',
    body: 'Get AI-powered insights and recommendations.',
    icon: Lightbulb,
  },
  {
    n: '04',
    title: 'Opportunities',
    body: 'Discover funding opportunities you may be eligible for.',
    icon: Target,
  },
];

export function LandingHowItWorks() {
  return (
    <section id="how" className="border-t border-border bg-card py-20">
      <div className="mx-auto max-w-[1200px] px-6">
        <div className="text-center">
          <h2 className="text-h1 font-bold tracking-tight text-text-primary md:text-h1">
            How VitalFlow Works
          </h2>
          <p className="mt-3 text-body text-text-secondary">
            A complete financial intelligence platform for your business in four steps.
          </p>
        </div>
        <div className="mt-12 grid gap-6 md:grid-cols-4">
          {STEPS.map(({ n, title, body, icon: Icon }) => (
            <div key={n} className="text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-brand/10 text-brand">
                <Icon className="h-6 w-6" />
              </div>
              <div className="mt-4 text-label-sm font-semibold uppercase tracking-wider text-brand">
                {n}
              </div>
              <h3 className="mt-1 text-h4 font-semibold text-text-primary">{title}</h3>
              <p className="mt-2 text-body-sm text-text-secondary">{body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
