'use client';

import { CheckCircle2, Eye, Lightbulb, Loader2, Wallet } from 'lucide-react';
import { timeAgo } from '@/lib/utils/format';
import { cn } from '@/lib/utils/cn';
import type { AgentRun } from '@/lib/api/types';

interface AgentPulseProps {
  runs: AgentRun[];
}

const AGENT_META: Record<string, { label: string; icon: typeof Eye; description: string; tone: 'brand' | 'teal' | 'amber' }> = {
  watcher: {
    label: 'Watcher',
    icon: Eye,
    description: 'Notices material changes in your business',
    tone: 'teal',
  },
  insight: {
    label: 'Insight',
    icon: Lightbulb,
    description: 'Ranks the next action to take',
    tone: 'brand',
  },
  'funding-outreach': {
    label: 'Funding Outreach',
    icon: Wallet,
    description: 'Drafts lender-ready evidence packs',
    tone: 'amber',
  },
};

const TONE_BG: Record<string, string> = {
  brand: 'bg-brand/10',
  teal: 'bg-brand-teal/10',
  amber: 'bg-warning/10',
};
const TONE_TEXT: Record<string, string> = {
  brand: 'text-brand',
  teal: 'text-brand-teal',
  amber: 'text-warning',
};

export function AgentPulse({ runs }: AgentPulseProps) {
  const byAgent: Record<string, AgentRun | undefined> = {
    watcher: runs.find((r) => r.agent === 'watcher'),
    insight: runs.find((r) => r.agent === 'insight'),
    'funding-outreach': runs.find((r) => r.agent === 'funding-outreach'),
  };

  return (
    <div className="grid gap-3 md:grid-cols-3">
      {(['watcher', 'insight', 'funding-outreach'] as const).map((id) => {
        const meta = AGENT_META[id]!;
        const lastRun = byAgent[id];
        return <AgentCard key={id} id={id} meta={meta} lastRun={lastRun} />;
      })}
    </div>
  );
}

function AgentCard({
  id,
  meta,
  lastRun,
}: {
  id: string;
  meta: { label: string; icon: typeof Eye; description: string; tone: 'brand' | 'teal' | 'amber' };
  lastRun?: AgentRun;
}) {
  const Icon = meta.icon;
  const isRunning = lastRun?.status === 'running' || lastRun?.status === 'pending';
  const isDone = lastRun?.status === 'completed';
  const isFailed = lastRun?.status === 'failed' || lastRun?.status === 'degraded';
  const isWatchingAlways = id === 'watcher' && !lastRun;

  const stateLabel = isRunning
    ? 'Running'
    : isDone
    ? 'Completed'
    : isFailed
    ? 'Degraded'
    : isWatchingAlways
    ? 'Watching'
    : 'Idle';

  const stateTone = isRunning
    ? 'text-brand'
    : isDone
    ? 'text-positive'
    : isFailed
    ? 'text-warning'
    : isWatchingAlways
    ? 'text-brand-teal'
    : 'text-text-secondary';

  return (
    <div className="relative overflow-hidden rounded-card border border-border bg-card p-4 transition-shadow hover:shadow-card-hover">
      <div className="flex items-start gap-3">
        <div
          className={cn(
            'flex h-10 w-10 shrink-0 items-center justify-center rounded-soft',
            TONE_BG[meta.tone],
            TONE_TEXT[meta.tone],
          )}
        >
          {isRunning ? <Loader2 className="h-4 w-4 animate-spin" /> : <Icon className="h-4 w-4" />}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <div className="text-h5 font-semibold text-text-primary">{meta.label}</div>
            <div className="flex items-center gap-1.5">
              {isRunning || isWatchingAlways ? (
                <span
                  className={cn('h-1.5 w-1.5 rounded-full', TONE_TEXT[meta.tone])}
                  style={{ backgroundColor: 'currentColor' }}
                />
              ) : null}
              {isDone ? <CheckCircle2 className="h-3.5 w-3.5 text-positive" /> : null}
              <span className={cn('text-meta-sm font-medium', stateTone)}>{stateLabel}</span>
            </div>
          </div>
          <p className="mt-0.5 text-meta-sm text-text-secondary">{meta.description}</p>

          <div className="mt-3 flex items-center justify-between border-t border-border pt-2.5 text-meta-sm">
            <div className="text-text-secondary">
              {lastRun ? (
                <>
                  <span className="tabular-nums">{lastRun.durationMs}ms</span>
                  {lastRun.tokensIn != null && lastRun.tokensOut != null ? (
                    <>
                      <span className="mx-1 text-text-muted">·</span>
                      <span className="tabular-nums">
                        {lastRun.tokensIn}→{lastRun.tokensOut}
                      </span>
                    </>
                  ) : null}
                </>
              ) : (
                <span className="italic">No runs yet</span>
              )}
            </div>
            <div className="text-meta-sm text-text-secondary">
              {lastRun ? timeAgo(lastRun.startedAt) : 'awaiting first analysis'}
            </div>
          </div>

          {lastRun?.model ? (
            <div className="mt-1.5 truncate font-mono text-meta-sm text-text-muted">
              {lastRun.model}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
