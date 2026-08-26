'use client';

import { motion } from 'framer-motion';
import { CheckCircle2, Eye, Lightbulb, Loader2, Sparkles, Wallet, Activity } from 'lucide-react';
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

const TONE_RING: Record<string, string> = {
  brand: 'shadow-glow-brand',
  teal: 'shadow-glow-teal',
  amber: 'shadow-[0_0_0_1px_rgba(245,158,11,0.18),0_8px_32px_-8px_rgba(245,158,11,0.35)]',
};

const TONE_BG: Record<string, string> = {
  brand: 'bg-brand/8',
  teal: 'bg-brand-teal/8',
  amber: 'bg-warning/8',
};

const TONE_TEXT: Record<string, string> = {
  brand: 'text-brand',
  teal: 'text-brand-teal',
  amber: 'text-warning',
};

/**
 * Agent Pulse — the "AI is working" centerpiece. Shows the three live
 * agents with their most recent run. Always-watching state has a soft
 * pulse; running state has a spinner; completed state has a check.
 *
 * Renders 3 cards. Each card has:
 *   - Icon with subtle outer-ring pulse when "watching"
 *   - Agent name + one-line description
 *   - Latest status (Watching / Running / Completed)
 *   - Last run timestamp + duration
 *
 * No mock data — the runs come from the real /api/audit endpoint.
 */
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
        return (
          <AgentCard
            key={id}
            id={id}
            meta={meta}
            lastRun={lastRun}
          />
        );
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
  // The Watcher is always "watching" — even if no runs yet, it shows
  // a soft pulse. The other two are stateful based on their last run.
  const isWatchingAlways = id === 'watcher' && !lastRun;
  const isRunning = lastRun?.status === 'running' || lastRun?.status === 'pending';
  const isDone = lastRun?.status === 'completed';
  const isFailed = lastRun?.status === 'failed' || lastRun?.status === 'degraded';

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
    <div
      className={cn(
        'group relative overflow-hidden rounded-card border border-border bg-card p-4 transition-shadow',
        isRunning && TONE_RING[meta.tone],
      )}
    >
      {/* Soft ambient glow on hover */}
      <div
        aria-hidden
        className={cn(
          'pointer-events-none absolute -inset-px rounded-card opacity-0 transition-opacity duration-300 group-hover:opacity-100',
          TONE_BG[meta.tone],
        )}
      />

      <div className="relative flex items-start gap-3">
        {/* Icon with pulse rings */}
        <div className="relative shrink-0">
          {isRunning || isWatchingAlways ? (
            <>
              <span
                aria-hidden
                className={cn(
                  'absolute inset-0 rounded-2xl animate-pulse-ring',
                  TONE_BG[meta.tone],
                )}
              />
              <span
                aria-hidden
                className={cn(
                  'absolute inset-0 rounded-2xl animate-pulse-ring [animation-delay:1.1s]',
                  TONE_BG[meta.tone],
                )}
              />
            </>
          ) : null}
          <div
            className={cn(
              'relative flex h-11 w-11 items-center justify-center rounded-2xl',
              TONE_BG[meta.tone],
              TONE_TEXT[meta.tone],
            )}
          >
            {isRunning ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Icon className="h-5 w-5" />
            )}
          </div>
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <div className="text-h5 font-semibold text-text-primary">{meta.label}</div>
            <div className="flex items-center gap-1.5">
              {(isRunning || isWatchingAlways) && (
                <span
                  className={cn(
                    'h-1.5 w-1.5 rounded-full animate-pulse-dot',
                    TONE_TEXT[meta.tone],
                  )}
                  style={{ backgroundColor: 'currentColor' }}
                />
              )}
              {isDone ? <CheckCircle2 className="h-3.5 w-3.5 text-positive" /> : null}
              <span className={cn('text-meta-sm font-medium', stateTone)}>{stateLabel}</span>
            </div>
          </div>
          <p className="mt-0.5 text-meta-sm text-text-secondary">{meta.description}</p>

          {/* Last run meta */}
          <div className="mt-3 flex items-center justify-between border-t border-border pt-2.5 text-meta-sm">
            <div className="text-text-secondary">
              {lastRun ? (
                <>
                  <span className="tabular-nums">{lastRun.durationMs}ms</span>
                  {lastRun.tokensIn != null && lastRun.tokensOut != null ? (
                    <>
                      <span className="mx-1 text-text-secondary/40">·</span>
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
            <div className="mt-1.5 truncate font-mono text-meta-sm text-text-secondary/70">
              {lastRun.model}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

/**
 * Compact pulse — used in cards and the upload zone. Just the ring
 * + icon, no text. Smaller.
 */
export function AgentPulseDot({ tone = 'brand', size = 8 }: { tone?: 'brand' | 'teal' | 'amber'; size?: number }) {
  const color = TONE_TEXT[tone];
  return (
    <span className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <span
        aria-hidden
        className={cn('absolute inset-0 rounded-full animate-pulse-ring', TONE_BG[tone])}
      />
      <span className={cn('relative h-1.5 w-1.5 rounded-full', color)} style={{ backgroundColor: 'currentColor' }} />
    </span>
  );
}
