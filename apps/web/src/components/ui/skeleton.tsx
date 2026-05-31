import { cn } from '@/lib/utils';

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('animate-pulse rounded-md bg-pitch-800', className)} />;
}

export function MatchCardSkeleton() {
  return (
    <div className="card-surface p-4 space-y-3">
      <div className="flex items-center gap-3">
        <div className="flex flex-1 items-center gap-2">
          <Skeleton className="h-7 w-7 rounded-full" />
          <Skeleton className="h-4 w-24" />
        </div>
        <Skeleton className="h-6 w-12" />
        <div className="flex flex-1 items-center justify-end gap-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-7 w-7 rounded-full" />
        </div>
      </div>
      <div className="flex justify-between">
        <Skeleton className="h-3 w-16" />
        <Skeleton className="h-5 w-20 rounded-full" />
      </div>
    </div>
  );
}

export function LeagueGroupSkeleton() {
  return (
    <div className="space-y-1">
      <Skeleton className="mb-2 h-5 w-40" />
      <MatchCardSkeleton />
      <MatchCardSkeleton />
      <MatchCardSkeleton />
    </div>
  );
}
