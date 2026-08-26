import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function LandingCta() {
  return (
    <section className="border-t border-border bg-canvas py-20">
      <div className="mx-auto max-w-3xl px-6 text-center">
        <h2 className="text-h1 font-bold tracking-tight text-brand-navy md:text-display">
          Make your bank say yes.
        </h2>
        <p className="mt-3 text-body text-text-secondary">
          The goal is not to give you a chart. The goal is to make the next conversation with
          your bank officer different — because you have a structured, traceable profile of
          your own business.
        </p>
        <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
          <Link href="/auth/sign-up">
            <Button size="lg">Get started <ArrowRight className="h-4 w-4" /></Button>
          </Link>
          <Link href="/auth/sign-in">
            <Button size="lg" variant="secondary">I already have an account</Button>
          </Link>
        </div>
      </div>
    </section>
  );
}
