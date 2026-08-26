import { Skeleton } from '@/components/ui/skeleton';

export default function Loading() {
  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between">
        <div>
          <Skeleton className="h-8 w-44" />
          <Skeleton className="mt-2 h-4 w-72" />
        </div>
        <Skeleton className="h-9 w-32" />
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        <Skeleton className="h-64" />
        <Skeleton className="h-64 md:col-span-2" />
      </div>
    </div>
  );
}
