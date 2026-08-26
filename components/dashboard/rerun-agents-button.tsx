'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { RefreshCw, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { runAgents, ApiError } from '@/lib/api/client';

export function RerunAgentsButton() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const onClick = async () => {
    setError(null);
    try {
      await runAgents();
      startTransition(() => router.refresh());
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Re-run failed.');
    }
  };

  return (
    <div className="flex items-center gap-2">
      <Button type="button" variant="secondary" size="sm" onClick={onClick} loading={isPending}>
        {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
        Re-run agents
      </Button>
      {error ? <span className="text-meta-sm text-negative">{error}</span> : null}
    </div>
  );
}
