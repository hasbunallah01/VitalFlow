import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { Logo } from '@/components/brand/logo';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-screen md:grid-cols-2">
      {/* Left — branding */}
      <aside className="relative hidden flex-col justify-between border-r border-border bg-canvas p-10 md:flex">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-label-sm text-text-secondary transition-colors hover:text-text-primary"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back to home
        </Link>
        <div>
          <Logo size="lg" withWordmark />
          <p className="mt-6 max-w-md text-body text-text-secondary">
            A financial intelligence platform for Caribbean MSMEs. Turn a bank statement
            into a lender-ready credit profile — and keep working long after the upload.
          </p>
          <div className="mt-8 max-w-md rounded-card border border-border bg-card p-5 shadow-card">
            <div className="text-label-sm uppercase tracking-wider text-text-secondary">
              Live buildathon build
            </div>
            <div className="mt-2 text-h5 font-semibold text-text-primary">
              Frontend design 2 · FutureCaribbean 2026
            </div>
            <p className="mt-1.5 text-label text-text-secondary">
              Real backend · real Qwen 3 30B · real Neon Postgres · real agents.
              No mock data in production paths.
            </p>
          </div>
        </div>
        <div className="text-label-sm text-text-muted">
          MIT licensed · Open source
        </div>
      </aside>

      {/* Right — form */}
      <main className="flex items-center justify-center px-6 py-10 md:px-10">
        <div className="w-full max-w-sm">
          <div className="mb-6 md:hidden">
            <Link href="/">
              <Logo size="md" withWordmark />
            </Link>
          </div>
          {children}
        </div>
      </main>
    </div>
  );
}
