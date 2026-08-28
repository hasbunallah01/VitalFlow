'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle2, Link as LinkIcon, X, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  approveFundingOutreach,
  revokeFundingOutreach,
  shareFundingOutreach,
  ApiError,
} from '@/lib/api/client';
import type { FundingOutreachDetail } from '@/lib/api/types';

const STAGES: Array<{ key: string; label: string }> = [
  { key: 'drafted', label: 'Drafted' },
  { key: 'approved', label: 'Approved' },
  { key: 'shared', label: 'Shared' },
  { key: 'viewed', label: 'Viewed' },
  { key: 'completed', label: 'Completed' },
];

export function ApproverBar({ outreach }: { outreach: FundingOutreachDetail }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const status = outreach.status;
  const idx = STAGES.findIndex((s) => s.key === status);
  const isRevoked = status === 'revoked' || status === 'failed';

  const run = (fn: () => Promise<unknown>) => {
    setError(null);
    startTransition(async () => {
      try {
        await fn();
        router.refresh();
      } catch (e) {
        setError(e instanceof ApiError ? e.message : 'Action failed.');
      }
    });
  };

  return (
    <Card>
      <CardContent>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            {STAGES.map((s, i) => {
              const reached = idx >= i;
              return (
                <div key={s.key} className="flex items-center gap-2">
                  <div
                    className={
                      reached
                        ? 'inline-flex h-7 items-center gap-1.5 rounded-pill bg-brand/10 px-2.5 text-label-sm font-medium text-brand'
                        : 'inline-flex h-7 items-center gap-1.5 rounded-pill bg-canvas px-2.5 text-label-sm font-medium text-text-muted'
                    }
                  >
                    <CheckCircle2 className={reached ? 'h-3 w-3' : 'h-3 w-3 text-text-muted'} />
                    {s.label}
                  </div>
                  {i < STAGES.length - 1 ? (
                    <span className="h-px w-6 bg-border" aria-hidden />
                  ) : null}
                </div>
              );
            })}
            {isRevoked ? <Badge tone="danger">Revoked</Badge> : null}
          </div>
          <div className="flex items-center gap-2">
            {!outreach.approvedAt ? (
              <Button
                size="sm"
                loading={pending}
                onClick={() => run(() => approveFundingOutreach(outreach.id))}
              >
                Approve
              </Button>
            ) : null}
            {outreach.approvedAt && !outreach.shareLink ? (
              <Button
                size="sm"
                loading={pending}
                onClick={() => run(() => shareFundingOutreach(outreach.id))}
              >
                <LinkIcon className="h-4 w-4" /> Generate link
              </Button>
            ) : null}
            {outreach.shareLink && !outreach.shareLink.revokedAt ? (
              <Button
                size="sm"
                variant="secondary"
                onClick={() => {
                  const url = `${window.location.origin}/l/${outreach.shareLink!.token}`;
                  navigator.clipboard?.writeText(url);
                }}
              >
                <LinkIcon className="h-4 w-4" /> Copy link
              </Button>
            ) : null}
            {(outreach.approvedAt || outreach.shareLink) && !outreach.shareLink?.revokedAt ? (
              <Button
                size="sm"
                variant="danger"
                loading={pending}
                onClick={() => run(() => revokeFundingOutreach(outreach.id))}
              >
                <X className="h-4 w-4" /> Revoke
              </Button>
            ) : null}
          </div>
        </div>
        {error ? <p className="mt-3 text-label-sm text-danger">{error}</p> : null}
      </CardContent>
    </Card>
  );
}
