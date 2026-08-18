'use client';

/**
 * CSV upload form. Posts to /api/upload. On success, redirects to
 * the resulting analysis page.
 *
 * Mobile-first: the dropzone is large enough to tap comfortably.
 * Shows a clear "uploading" state (no fake progress bar — honest state).
 */

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

type Status =
  | { kind: 'idle' }
  | { kind: 'uploading' }
  | { kind: 'success'; analysisId: string; score: number; band: string }
  | { kind: 'error'; message: string };

export function UploadForm() {
  const router = useRouter();
  const [file, setFile] = React.useState<File | null>(null);
  const [status, setStatus] = React.useState<Status>({ kind: 'idle' });
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [drag, setDrag] = React.useState(false);

  function onPick(f: File | null) {
    if (!f) return;
    if (!f.name.toLowerCase().endsWith('.csv')) {
      setStatus({ kind: 'error', message: 'Please pick a .csv file.' });
      return;
    }
    setFile(f);
    setStatus({ kind: 'idle' });
  }

  async function submit() {
    if (!file) return;
    setStatus({ kind: 'uploading' });
    const fd = new FormData();
    fd.append('file', file);
    try {
      const res = await fetch('/api/upload', { method: 'POST', body: fd });
      const data = await res.json();
      if (!res.ok) {
        setStatus({ kind: 'error', message: data.error ?? 'Upload failed' });
        return;
      }
      setStatus({ kind: 'success', analysisId: data.analysisId, score: data.score, band: data.band });
      router.push(`/analysis/${data.analysisId}`);
    } catch (e) {
      setStatus({ kind: 'error', message: e instanceof Error ? e.message : 'Upload failed' });
    }
  }

  const loading = status.kind === 'uploading';

  return (
    <div className="space-y-4">
      <div
        onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDrag(false);
          const f = e.dataTransfer.files?.[0];
          if (f) onPick(f);
        }}
        onClick={() => inputRef.current?.click()}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') inputRef.current?.click();
        }}
        className={cn(
          'flex min-h-[180px] sm:min-h-[220px] cursor-pointer flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed p-6 text-center transition-colors',
          drag ? 'border-brand-600 bg-brand-50' : 'border-border bg-white hover:bg-ink-900/[0.02]',
          loading && 'pointer-events-none opacity-60',
        )}
      >
        <UploadIcon className="h-8 w-8 text-ink-300" />
        {file ? (
          <p className="text-sm">
            <span className="font-medium text-ink-900">{file.name}</span>
            <span className="ml-2 text-ink-500">({(file.size / 1024).toFixed(1)} KB)</span>
          </p>
        ) : (
          <>
            <p className="text-sm font-medium text-ink-900">Drag &amp; drop a CSV here</p>
            <p className="text-xs text-ink-500">or tap to choose a file · max 10 MB</p>
          </>
        )}
        <input
          ref={inputRef}
          type="file"
          accept=".csv,text/csv"
          className="hidden"
          onChange={(e) => onPick(e.target.files?.[0] ?? null)}
        />
      </div>

      {status.kind === 'error' && (
        <p className="rounded-md bg-critical-bg px-3 py-2 text-sm text-critical">{status.message}</p>
      )}

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-ink-500">
          {file ? `Selected: ${file.name}` : 'No file selected yet.'}
        </p>
        <Button
          type="button"
          onClick={submit}
          disabled={!file || loading}
          size="lg"
        >
          {loading ? 'Parsing…' : 'Run analysis'}
        </Button>
      </div>
    </div>
  );
}

function UploadIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="17 8 12 3 7 8" />
      <line x1="12" y1="3" x2="12" y2="15" />
    </svg>
  );
}
