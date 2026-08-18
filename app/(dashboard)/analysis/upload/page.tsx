import { UploadForm } from '@/components/upload/upload-form';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default function UploadPage() {
  return (
    <div className="space-y-6">
      <header>
        <p className="text-sm text-ink-500">Step 1 of 1</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">Upload a bank statement</h1>
        <p className="mt-2 max-w-2xl text-sm text-ink-500">
          Drop a CSV exported from your bank. We'll parse it, compute your
          health score across five pillars, and surface a funding plan — all
          in a few seconds. Your file is processed in-memory and the raw
          rows are not stored beyond the demo session.
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Drop your CSV</CardTitle>
          <CardDescription>
            The first row must be a header. We expect at minimum a date
            column, a narrative/description column, and a withdrawal /
            debit + deposit / credit pair. Most Caribbean banks export
            in this format.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <UploadForm />
        </CardContent>
      </Card>

      <p className="text-xs text-ink-300">
        Need a sample? The demo is wired to the fixture at{' '}
        <Link href="/dashboard" className="underline">/dashboard</Link>.
      </p>
    </div>
  );
}
