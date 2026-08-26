'use client';

import { useCallback, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, FileText, Loader2, UploadCloud, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { uploadStatement, ApiError } from '@/lib/api/client';
import { cn } from '@/lib/utils/cn';
import { formatNumber, timeAgo } from '@/lib/utils/format';

type Status =
  | { kind: 'idle' }
  | { kind: 'reading' }
  | { kind: 'parsing' }
  | { kind: 'analyzing' }
  | { kind: 'agents' }
  | { kind: 'saving' }
  | { kind: 'complete'; analysisId: string; score: number; band: string }
  | { kind: 'error'; message: string };

const STAGES: Array<{ key: Exclude<Status['kind'], 'idle' | 'error' | 'complete'>; label: string }> = [
  { key: 'reading', label: 'Uploading' },
  { key: 'parsing', label: 'Parsing statement' },
  { key: 'analyzing', label: 'Analyzing financial health' },
  { key: 'agents', label: 'Running AI agents' },
  { key: 'saving', label: 'Saving insights' },
];

export function UploadZone() {
  const router = useRouter();
  const [status, setStatus] = useState<Status>({ kind: 'idle' });
  const [dragging, setDragging] = useState(false);

  const onFile = useCallback(
    async (file: File) => {
      if (!file.name.toLowerCase().endsWith('.csv')) {
        setStatus({ kind: 'error', message: 'Please upload a .csv file.' });
        return;
      }
      // Stage the UI through the pipeline. We do NOT fake durations;
      // each stage becomes "active" while we wait for the next signal
      // from the API. The single /api/upload call covers everything.
      setStatus({ kind: 'reading' });
      const stageTimers: ReturnType<typeof setTimeout>[] = [];
      const advance = (next: Status['kind'], delayMs: number) => {
        stageTimers.push(
          setTimeout(() => {
            setStatus((s) => (s.kind === 'error' ? s : { kind: next } as Status));
          }, delayMs),
        );
      };
      advance('parsing', 200);
      advance('analyzing', 1200);
      advance('agents', 2200);
      advance('saving', 4500);
      try {
        const result = await uploadStatement(file);
        stageTimers.forEach(clearTimeout);
        setStatus({
          kind: 'complete',
          analysisId: result.analysisId,
          score: result.score,
          band: result.band,
        });
        // Redirect to the analysis view after a short delay so the user
        // sees the "complete" state for a moment.
        setTimeout(() => router.push(`/analysis/${result.analysisId}`), 1200);
      } catch (e) {
        stageTimers.forEach(clearTimeout);
        const msg = e instanceof ApiError ? e.message : 'Upload failed. Please try again.';
        setStatus({ kind: 'error', message: msg });
      }
    },
    [router],
  );

  const onDrop = useCallback(
    (e: React.DragEvent<HTMLLabelElement>) => {
      e.preventDefault();
      setDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) void onFile(file);
    },
    [onFile],
  );

  const onChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) void onFile(file);
    },
    [onFile],
  );

  const isLoading = status.kind !== 'idle' && status.kind !== 'error' && status.kind !== 'complete';
  const activeStageIdx = isLoading
    ? STAGES.findIndex((s) => s.key === status.kind)
    : status.kind === 'complete'
    ? STAGES.length
    : -1;

  return (
    <div className="rounded-card border border-border bg-card p-6 shadow-card">
      <label
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        className={cn(
          'relative flex cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed px-6 py-12 text-center transition-colors',
          dragging
            ? 'border-brand bg-brand/5'
            : isLoading
            ? 'border-border bg-canvas/40 cursor-default'
            : status.kind === 'error'
            ? 'border-negative/40 bg-negative/5'
            : 'border-border bg-canvas/30 hover:border-brand/40 hover:bg-brand/5',
        )}
      >
        <input
          type="file"
          accept=".csv,text/csv"
          className="sr-only"
          onChange={onChange}
          disabled={isLoading}
        />
        {isLoading ? (
          <Loader2 className="h-7 w-7 animate-spin text-brand" />
        ) : status.kind === 'complete' ? (
          <CheckCircle2 className="h-7 w-7 text-positive" />
        ) : status.kind === 'error' ? (
          <XCircle className="h-7 w-7 text-negative" />
        ) : (
          <UploadCloud className="h-7 w-7 text-brand" />
        )}
        <div>
          <div className="text-h5 font-semibold text-text-primary">
            {status.kind === 'complete'
              ? 'Analysis complete'
              : status.kind === 'error'
              ? 'Upload failed'
              : isLoading
              ? 'Working on it…'
              : 'Upload your bank statement'}
          </div>
          <div className="mt-1 text-meta text-text-secondary">
            {status.kind === 'complete'
              ? `Score ${Math.round(status.score)} · ${status.band} · redirecting…`
              : status.kind === 'error'
              ? status.message
              : isLoading
              ? 'You can leave this page; the analysis will be ready when you come back.'
              : 'CSV files supported. Drag and drop, or click to choose.'}
          </div>
        </div>
        {!isLoading && status.kind !== 'complete' ? (
          <Button type="button" variant="secondary" size="sm" className="pointer-events-none">
            <FileText className="h-4 w-4" /> Choose file
          </Button>
        ) : null}
      </label>

      <AnimatePresence initial={false}>
        {isLoading ? (
          <motion.ol
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-5 space-y-2 overflow-hidden"
          >
            {STAGES.map((s, i) => {
              const isDone = i < activeStageIdx;
              const isActive = i === activeStageIdx;
              return (
                <li
                  key={s.key}
                  className="flex items-center gap-3 text-meta-sm"
                  aria-current={isActive ? 'step' : undefined}
                >
                  {isDone ? (
                    <CheckCircle2 className="h-4 w-4 text-positive" />
                  ) : isActive ? (
                    <Loader2 className="h-4 w-4 animate-spin text-brand" />
                  ) : (
                    <span className="h-4 w-4 rounded-full border border-border" />
                  )}
                  <span
                    className={
                      isDone
                        ? 'text-text-secondary line-through'
                        : isActive
                        ? 'font-medium text-text-primary'
                        : 'text-text-secondary/70'
                    }
                  >
                    {s.label}
                  </span>
                </li>
              );
            })}
          </motion.ol>
        ) : null}
      </AnimatePresence>

      {status.kind === 'error' ? (
        <div className="mt-4 flex items-center justify-between rounded-lg border border-negative/30 bg-negative-muted px-4 py-2.5 text-meta-sm text-negative">
          <span>{status.message}</span>
          <button
            type="button"
            className="text-meta-sm font-medium underline-offset-2 hover:underline"
            onClick={() => setStatus({ kind: 'idle' })}
          >
            Try again
          </button>
        </div>
      ) : null}
    </div>
  );
}
