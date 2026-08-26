import Link from 'next/link';
import { Logo } from '@/components/brand/logo';
import { Button } from '@/components/ui/button';

export function LandingNav() {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-border/60 bg-card/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        <Link href="/" className="flex items-center" aria-label="VitalFlow home">
          <Logo size="md" withWordmark />
        </Link>
        <nav className="hidden items-center gap-7 md:flex" aria-label="Main">
          <Link href="#product" className="text-body-sm text-text-secondary transition-colors hover:text-text-primary">
            Product
          </Link>
          <Link href="#how-it-works" className="text-body-sm text-text-secondary transition-colors hover:text-text-primary">
            How it works
          </Link>
          <Link href="#insights" className="text-body-sm text-text-secondary transition-colors hover:text-text-primary">
            Insights
          </Link>
          <Link href="#funding" className="text-body-sm text-text-secondary transition-colors hover:text-text-primary">
            Funding
          </Link>
        </nav>
        <div className="flex items-center gap-2">
          <Link href="/auth/sign-in">
            <Button variant="ghost" size="sm">Sign in</Button>
          </Link>
          <Link href="/auth/sign-up">
            <Button size="sm">Get started</Button>
          </Link>
        </div>
      </div>
    </header>
  );
}
