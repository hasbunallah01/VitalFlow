import Link from 'next/link';
import { Logo } from '@/components/brand/logo';

export function LandingFooter() {
  return (
    <footer className="border-t border-border bg-card py-10">
      <div className="mx-auto flex max-w-[1200px] flex-col items-center justify-between gap-4 px-6 md:flex-row">
        <Logo size="sm" withWordmark />
        <div className="text-label text-text-muted">
          MIT licensed · Open source · FutureCaribbean 2026
        </div>
        <div className="flex items-center gap-5 text-label text-text-secondary">
          <Link href="https://github.com/hasbunallah01/VitalFlow" className="hover:text-text-primary">
            GitHub
          </Link>
          <Link href="#" className="hover:text-text-primary">Docs</Link>
          <Link href="#" className="hover:text-text-primary">Contact</Link>
        </div>
      </div>
    </footer>
  );
}
