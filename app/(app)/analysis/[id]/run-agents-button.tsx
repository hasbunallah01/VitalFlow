'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { runAgents, ApiError } from '@/lib/api/client';

export function RunAgentsButton({ analysisId }: { analysisId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  return (
    <div className="flex flex-col items-end gap-1">
      <Button
        size="md"
        loading={loading}
        onClick={async () => {
          setLoading(true);
          setError(null);
          try {
            await runAgents();
            router.refresh();
          } catch (e) {
            setError(e instanceof ApiError ? e.message : 'Failed to run agents.');
          } finally {
            setLoading(false);
          }
        }}
      >
        {loading ? null : <Sparkles className="h-4 w-4" />}
        {loading ? 'Running…' : 'Run agents'}
      </Button>
      {error ? <span className="text-label-sm text-danger">{error}</span> : null}
    </div>
  );
}
