'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Check, Copy, ExternalLink, Loader2, Share2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  approveFundingOutreach,
  revokeFundingOutreach,
  shareFundingOutreach,
  ApiError,
} from '@/lib/api/client';
import type { FundingOutreachDetail } from '@/lib/api/types';

interface OutreachActionsProps {
  outreach: FundingOutreachDetail;
}

export function OutreachActions({ outreach }: OutreachActionsProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const status = outreach.status;
  const isDrafted = status === 'drafted';
  const isApproved = status === 'approved' || status === 'shared' || status === 'viewed' || status === 'completed';
  const isRevoked = status === 'revoked';
  const isShared = !!outreach.shareLink && !outreach.shareLink.revokedAt;

  const onApprove = async () => {
    setError(null);
    try {
      await approveFundingOutreach(outreach.id);
      startTransition(() => router.refresh());
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Approve failed.');
    }
  };
  const onRevoke = async () => {
    setError(null);
    try {
      await revokeFundingOutreach(outreach.id);
      startTransition(() => router.refresh());
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Revoke failed.');
    }
  };
  const onShare = async () => {
    setError(null);
    try {
      await shareFundingOutreach(outreach.id);
      startTransition(() => router.refresh());
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Share failed.');
    }
  };
  const onCopy = async () => {
    if (!outreach.shareLink) return;
    const url = `${window.location.origin}/lender/${outreach.shareLink.token}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      setError('Could not copy. Select the link manually.');
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        {isDrafted ? (
          <Button size="sm" onClick={onApprove} loading={isPending}>
            <Check className="h-4 w-4" /> Approve outreach
          </Button>
        ) : null}
        {isApproved && !isShared ? (
          <Button size="sm" onClick={onShare} loading={isPending}>
            <Share2 className="h-4 w-4" /> Create share link
          </Button>
        ) : null}
        {isShared ? (
          <Button size="sm" variant="secondary" onClick={onCopy}>
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            {copied ? 'Copied!' : 'Copy lender link'}
          </Button>
        ) : null}
        {!isRevoked ? (
          <Button size="sm" variant="ghost" onClick={onRevoke} loading={isPending}>
            <X className="h-4 w-4" /> Revoke
          </Button>
        ) : null}
      </div>
      {outreach.shareLink ? (
        <div className="rounded-lg bg-canvas px-3 py-2 text-meta-sm">
          <div className="text-text-secondary">Lender URL</div>
          <div className="mt-0.5 flex items-center gap-2">
            <code className="flex-1 truncate rounded bg-card px-2 py-1 font-mono text-meta-sm text-text-primary">
              /lender/{outreach.shareLink.token}
            </code>
            <a
              href={`/lender/${outreach.shareLink.token}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-0.5 text-meta-sm text-brand-bright hover:text-brand"
            >
              Open <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        </div>
      ) : null}
      {error ? <p className="text-meta-sm text-negative">{error}</p> : null}
    </div>
  );
}
